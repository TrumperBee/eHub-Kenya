import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { ORDER_STATUS } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setLoading(true);
    getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')))
      .then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const handleReleaseEscrow = async (orderId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'completed',
        escrowStatus: 'released',
        updatedAt: new Date().toISOString(),
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed', escrowStatus: 'released' } : o));
      toast.success('Escrow released. Order completed.');
    } catch {
      toast.error('Failed to release escrow');
    }
  };

  const handleRefund = async (orderId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'refunded',
        escrowStatus: 'refunded',
        updatedAt: new Date().toISOString(),
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refunded', escrowStatus: 'refunded' } : o));
      toast.success('Order refunded. Manual M-Pesa reversal required.');
    } catch {
      toast.error('Failed to refund order');
    }
  };

  return (
    <AdminLayout>
      <h2 className="font-heading text-xl font-bold text-white mb-6">All Orders</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-[#5C5C5C] text-sm">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Order ID</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Buyer</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Seller</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Listing</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Amount</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Status</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Escrow</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Date</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {orders.map((order) => {
                const cfg = ORDER_STATUS[order.status] || {};
                const isExpanded = expanded === order.id;
                const isDisputed = order.status === 'disputed';
                return (
                  <>
                    <tr key={order.id} className="hover:bg-[#242424] transition-colors">
                      <td className="py-3 text-sm font-mono text-[#9E9E9E]">{order.id?.slice(0, 8)}...</td>
                      <td className="py-3 text-sm text-white">{order.buyerDisplayName || '—'}</td>
                      <td className="py-3 text-sm text-white">{order.sellerDisplayName || '—'}</td>
                      <td className="py-3 text-sm text-[#9E9E9E] max-w-[150px] truncate">{order.listingTitle || '—'}</td>
                      <td className="py-3 text-sm font-semibold text-white">{formatKES(order.amount)}</td>
                      <td className="py-3">
                        <span className={`text-xs ${cfg.color || 'text-[#9E9E9E]'}`}>{cfg.label || order.status}</span>
                      </td>
                      <td className="py-3 text-sm text-[#9E9E9E]">{order.escrowStatus || '—'}</td>
                      <td className="py-3 text-sm text-[#9E9E9E]">{formatDate(order.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setExpanded(isExpanded ? null : order.id)} className="px-2 py-1 text-xs bg-[#242424] text-[#9E9E9E] rounded-lg border border-[#2A2A2A] hover:text-white transition-colors">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {(isDisputed || order.status === 'payment_confirmed') && (
                            <button onClick={() => handleReleaseEscrow(order.id)} className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded-lg border border-green-400/30 hover:bg-green-600/30 transition-colors">
                              Release
                            </button>
                          )}
                          {isDisputed && (
                            <button onClick={() => handleRefund(order.id)} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded-lg border border-red-400/30 hover:bg-red-600/30 transition-colors">
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${order.id}-expanded`}>
                        <td colSpan={9} className="px-4 py-3 bg-[#111]">
                          <div className="text-xs text-[#9E9E9E] space-y-1">
                            <p><span className="text-[#5C5C5C]">Receipt:</span> {order.mpesaReceiptNumber || '—'}</p>
                            {order.disputeReason && <p><span className="text-[#5C5C5C]">Dispute Reason:</span> {order.disputeReason}</p>}
                            <p><span className="text-[#5C5C5C]">Payment Phone:</span> {order.paymentPhone || '—'}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
