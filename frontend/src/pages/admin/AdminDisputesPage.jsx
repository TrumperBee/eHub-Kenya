import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { formatKES, formatDate } from '../../utils/formatters';
import { AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'orders'), where('status', '==', 'disputed'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const withDetails = await Promise.all(orders.map(async (order) => {
        let buyerName = order.buyerDisplayName || '—';
        let sellerName = order.sellerDisplayName || '—';
        let buyerEmail = '';
        let sellerEmail = '';

        try {
          if (order.buyerId) {
            const b = await getDoc(doc(db, 'users', order.buyerId));
            if (b.exists()) { buyerName = b.data().displayName || buyerName; buyerEmail = b.data().email || ''; }
          }
        } catch {}
        try {
          if (order.sellerId) {
            const s = await getDoc(doc(db, 'users', order.sellerId));
            if (s.exists()) { sellerName = s.data().displayName || sellerName; sellerEmail = s.data().email || ''; }
          }
        } catch {}

        let messages = [];
        try {
          const msgSnap = await getDocs(query(collection(db, 'orders', order.id, 'messages'), orderBy('createdAt', 'desc')));
          messages = msgSnap.docs.slice(0, 10).map(d => d.data());
        } catch {}

        return { ...order, buyerName, sellerName, buyerEmail, sellerEmail, messages };
      }));

      setDisputes(withDetails);
    } catch (err) {
      console.error('Fetch disputes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseToSeller = async (order) => {
    setActionId(order.id);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'completed',
        escrowStatus: 'released',
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Escrow released to seller (${order.sellerName})`);
      setDisputes(prev => prev.filter(d => d.id !== order.id));
    } catch {
      toast.error('Failed to release escrow');
    } finally {
      setActionId(null);
      setConfirmAction(null);
    }
  };

  const handleRefundBuyer = async (order) => {
    setActionId(order.id);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'refunded',
        escrowStatus: 'refunded',
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Order refunded to buyer (${order.buyerName}). Manual M-Pesa reversal required.`);
      setDisputes(prev => prev.filter(d => d.id !== order.id));
    } catch {
      toast.error('Failed to refund order');
    } finally {
      setActionId(null);
      setConfirmAction(null);
    }
  };

  return (
    <AdminLayout>
      <h2 className="font-heading text-xl font-bold text-white mb-6">Dispute Resolution</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle size={40} className="mx-auto mb-3 text-[#5C5C5C]" />
          <p className="text-[#5C5C5C] text-sm">No active disputes. Everything looks good.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((order) => (
            <div key={order.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-[#5C5C5C]">Order ID</p>
                  <p className="text-sm font-mono text-white">{order.id}</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold bg-red-400/10 text-red-400 border border-red-400/30 rounded-full">
                  DISPUTED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-[#5C5C5C] mb-1">Buyer</p>
                  <p className="text-sm text-white">{order.buyerName}</p>
                  {order.buyerEmail && <p className="text-xs text-[#5C5C5C]">{order.buyerEmail}</p>}
                </div>
                <div>
                  <p className="text-xs text-[#5C5C5C] mb-1">Seller</p>
                  <p className="text-sm text-white">{order.sellerName}</p>
                  {order.sellerEmail && <p className="text-xs text-[#5C5C5C]">{order.sellerEmail}</p>}
                </div>
                <div>
                  <p className="text-xs text-[#5C5C5C] mb-1">Listing</p>
                  <p className="text-sm text-white">{order.listingTitle || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5C5C5C] mb-1">Amount</p>
                  <p className="font-heading text-lg font-bold text-white">{formatKES(order.amount)}</p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-[#242424] rounded-xl">
                <p className="text-xs font-semibold text-red-400 mb-1">Dispute Reason</p>
                <p className="text-sm text-[#9E9E9E]">{order.disputeReason || 'No reason provided'}</p>
                <p className="text-xs text-[#5C5C5C] mt-1">Disputed: {formatDate(order.updatedAt)}</p>
              </div>

              {order.messages?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[#9E9E9E] mb-2">Recent Messages (last 10)</p>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {order.messages.slice().reverse().map((msg, i) => (
                      <p key={i} className={`text-xs ${msg.messageType === 'system' ? 'text-[#5C5C5C] italic' : 'text-[#9E9E9E]'}`}>
                        <span className="text-[#5C5C5C]">{msg.senderDisplayName || msg.senderRole}:</span> {msg.content}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-[#2A2A2A]">
                {confirmAction === order.id ? (
                  <>
                    <button onClick={() => handleReleaseToSeller(order)} disabled={actionId === order.id} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      <CheckCircle size={16} />
                      {actionId === order.id ? 'Processing...' : 'Confirm Release'}
                    </button>
                    <button onClick={() => handleRefundBuyer(order)} disabled={actionId === order.id} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      <RotateCcw size={16} />
                      {actionId === order.id ? 'Processing...' : 'Confirm Refund'}
                    </button>
                    <button onClick={() => setConfirmAction(null)} className="px-4 py-2.5 text-sm text-[#5C5C5C] hover:text-white transition-colors">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirmAction(order.id)} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                      <CheckCircle size={16} />
                      Release to Seller
                    </button>
                    <button onClick={() => setConfirmAction(order.id)} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                      <RotateCcw size={16} />
                      Refund Buyer
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
