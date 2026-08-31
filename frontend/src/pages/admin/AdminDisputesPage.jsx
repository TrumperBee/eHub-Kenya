import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, getDoc, doc, updateDoc, onSnapshot, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { formatKES, formatDate } from '../../utils/formatters';
import { CheckCircle, RotateCcw, X, MessageSquare, Scale } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DISPUTE_RESOLUTIONS,
  buildDisputeResolution,
  formatKesLabel,
} from '../../services/disputeResolver';
import {
  getOrderMessagesRef,
  sendSystemMessage,
} from '../../services/chatService';

function MessageLine({ msg }) {
  const isSystem = msg.messageType === 'system' || msg.senderRole === 'system' || msg.type === 'system';
  const content = msg.content || msg.text || '';
  if (isSystem) {
    return (
      <p className="text-xs text-konami-text-muted italic">
        {content}
      </p>
    );
  }
  return (
    <p className="text-xs text-konami-text-dim">
      <span className="text-konami-text-muted font-medium">{msg.senderDisplayName || msg.senderRole || 'User'}:</span>{' '}
      {content}
    </p>
  );
}

export default function AdminDisputesPage() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('active');
  const [activeDisputes, setActiveDisputes] = useState([]);
  const [resolvedDisputes, setResolvedDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [pendingResolution, setPendingResolution] = useState(null);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const [activeSnap, resolvedSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), where('status', '==', 'disputed'), orderBy('updatedAt', 'desc'))),
        getDocs(query(
          collection(db, 'orders'),
          where('disputeResolution', 'in', [DISPUTE_RESOLUTIONS.release.key, DISPUTE_RESOLUTIONS.refund.key])
        )),
      ]);

      const enrich = async (orders) => await Promise.all(orders.map(async (order) => {
        const buyer = order.buyerId ? await getDoc(doc(db, 'users', order.buyerId)).catch(() => null) : null;
        const seller = order.sellerId ? await getDoc(doc(db, 'users', order.sellerId)).catch(() => null) : null;
        const buyerData = buyer?.exists() ? buyer.data() : {};
        const sellerData = seller?.exists() ? seller.data() : {};
        return {
          ...order,
          buyerName: order.buyerDisplayName || buyerData.displayName || '-',
          buyerEmail: buyerData.email || '',
          sellerName: order.sellerDisplayName || sellerData.displayName || '-',
          sellerEmail: sellerData.email || '',
          sellerPhone: sellerData.phoneNumber || '',
        };
      }));

      setActiveDisputes(await enrich(activeSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      setResolvedDisputes(await enrich(resolvedSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
    } catch (err) {
      console.error('Fetch disputes error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  // Realtime chat evidence for each active dispute
  useEffect(() => {
    const unsubs = activeDisputes.map((order) =>
      onSnapshot(query(getOrderMessagesRef(order.id), orderBy('createdAt', 'asc')), (snap) => {
        const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setActiveDisputes((prev) => prev.map((o) => (o.id === order.id ? { ...o, messages } : o)));
      }, (err) => console.warn('Message subscription error:', err.code))
    );
    return () => unsubs.forEach((u) => u());
  }, [activeDisputes.map((o) => o.id).join(',')]);

  const openResolution = (order, resolution) => {
    const plan = buildDisputeResolution(order, resolution, {
      actorId: currentUser?.uid || '',
      buyerPhone: order.paymentPhone || '',
      sellerPhone: order.sellerPhone || '',
    });
    setPendingResolution({ order, resolution, plan });
  };

  const confirmResolution = async () => {
    if (!pendingResolution) return;
    const { order, resolution, plan } = pendingResolution;
    setResolving(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), plan.orderPatch);
      if (resolution === 'release') {
        if (order.listingId) {
          await updateDoc(doc(db, 'listings', order.listingId), { status: 'sold', updatedAt: serverTimestamp() }).catch(() => {});
        }
        if (order.sellerId) {
          await updateDoc(doc(db, 'users', order.sellerId), { totalSales: increment(1) }).catch(() => {});
        }
      }
      await sendSystemMessage(order.id, plan.systemMessage);
      toast.success(plan.manualAction.title + ' pending.');
      setPendingResolution(null);
      await fetchDisputes();
    } catch (err) {
      console.error('Resolve dispute error:', err);
      toast.error('Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  const renderCard = (order) => {
    const messages = order.messages || [];
    return (
      <div key={order.id} className="bg-white border border-konami-mid-gray rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-konami-text-muted">Order ID</p>
            <p className="text-sm font-mono text-konami-text break-all">{order.id}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${tab === 'active' ? 'bg-red-50 text-konami-red border border-konami-red/30' : 'bg-green-50 text-green-600 border border-green-300/40'}`}>
              {tab === 'active' ? 'DISPUTED' : (DISPUTE_RESOLUTIONS[order.disputeResolution === DISPUTE_RESOLUTIONS.refund.key ? 'refund' : 'release']?.label || order.disputeResolution)}
            </span>
            {order.resolvedAt && <span className="text-[10px] text-konami-text-muted">Resolved {formatDate(order.resolvedAt)}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-konami-text-muted mb-1">Buyer</p>
            <p className="text-sm text-konami-text">{order.buyerName}</p>
            {order.buyerEmail && <p className="text-xs text-konami-text-muted break-all">{order.buyerEmail}</p>}
            {order.paymentPhone && <p className="text-xs text-konami-text-muted font-mono">{order.paymentPhone}</p>}
          </div>
          <div>
            <p className="text-xs text-konami-text-muted mb-1">Seller</p>
            <p className="text-sm text-konami-text">{order.sellerName}</p>
            {order.sellerEmail && <p className="text-xs text-konami-text-muted break-all">{order.sellerEmail}</p>}
            {order.sellerPhone && <p className="text-xs text-konami-text-muted font-mono">{order.sellerPhone}</p>}
          </div>
          <div>
            <p className="text-xs text-konami-text-muted mb-1">Listing</p>
            <p className="text-sm text-konami-text">{order.listingTitle || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-konami-text-muted mb-1">Amount</p>
            <p className="font-heading text-lg font-bold text-konami-text">{formatKES(order.amount)}</p>
          </div>
        </div>

        {order.mpesaReceiptNumber && (
          <div className="mb-4 p-3 bg-konami-light-gray rounded-xl">
            <p className="text-xs text-konami-text-muted mb-0.5">M-Pesa Receipt</p>
            <p className="text-sm font-mono text-konami-text">{order.mpesaReceiptNumber}</p>
          </div>
        )}

        <div className="mb-4 p-3 bg-red-50 rounded-xl border border-konami-red/20">
          <p className="text-xs font-semibold text-konami-red mb-1">Dispute Reason</p>
          <p className="text-sm text-konami-text-dim">{order.disputeReason || 'No reason provided'}</p>
          <p className="text-xs text-konami-text-muted mt-1">Disputed: {formatDate(order.updatedAt)}</p>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-konami-text-muted mb-2 flex items-center gap-1.5">
            <MessageSquare size={12} /> Chat & Evidence ({messages.length})
          </p>
          <div className="space-y-1 max-h-[180px] overflow-y-auto p-3 bg-konami-light-gray rounded-xl">
            {messages.length === 0 ? (
              <p className="text-xs text-konami-text-muted">No messages in this order.</p>
            ) : (
              messages.map((msg) => <MessageLine key={msg.id || msg.createdAt} msg={msg} />)
            )}
          </div>
        </div>

        {tab === 'active' && (
          <div className="flex gap-3 pt-3 border-t border-konami-mid-gray">
            <button onClick={() => openResolution(order, 'release')} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              <CheckCircle size={16} /> Release to Seller
            </button>
            <button onClick={() => openResolution(order, 'refund')} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
              <RotateCcw size={16} /> Refund Buyer
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-bold text-konami-text">Dispute Resolution</h2>
        <div className="flex gap-1 bg-konami-light-gray rounded-lg p-1">
          <button onClick={() => setTab('active')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${tab === 'active' ? 'bg-white text-konami-blue shadow-sm' : 'text-konami-text-muted hover:text-konami-text'}`}>
            Active ({activeDisputes.length})
          </button>
          <button onClick={() => setTab('resolved')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${tab === 'resolved' ? 'bg-white text-konami-blue shadow-sm' : 'text-konami-text-muted hover:text-konami-text'}`}>
            Resolved ({resolvedDisputes.length})
          </button>
        </div>
      </div>

      <div className="mb-4 p-4 rounded-xl bg-konami-blue/5 border border-konami-blue/20">
        <p className="text-sm text-konami-text-dim leading-relaxed">
          Review the dispute and the order chat below, then choose a resolution. Funds are only ever moved after you complete the corresponding <strong>manual M-Pesa action</strong> shown at confirmation — there is no automated payout or reversal in this system.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
        </div>
      ) : tab === 'active' ? (
        activeDisputes.length === 0 ? (
          <div className="text-center py-12">
            <Scale size={40} className="mx-auto mb-3 text-konami-text-muted" />
            <p className="text-konami-text-muted text-sm">No active disputes. Everything looks good.</p>
          </div>
        ) : (
          <div className="space-y-4">{activeDisputes.map(renderCard)}</div>
        )
      ) : (
        resolvedDisputes.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={40} className="mx-auto mb-3 text-konami-text-muted" />
            <p className="text-konami-text-muted text-sm">No resolved disputes yet.</p>
          </div>
        ) : (
          <div className="space-y-4">{resolvedDisputes.map(renderCard)}</div>
        )
      )}

      {pendingResolution && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !resolving && setPendingResolution(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: pendingResolution.resolution === 'refund' ? '#FEE2E2' : '#DCFCE7', color: pendingResolution.resolution === 'refund' ? '#DC2626' : '#16A34A' }}>
                  {pendingResolution.resolution === 'refund' ? <RotateCcw size={20} /> : <CheckCircle size={20} />}
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-konami-text">
                    {pendingResolution.resolution === 'refund' ? 'Refund Buyer' : 'Release to Seller'}
                  </h3>
                  <p className="text-xs text-konami-text-muted">{formatKesLabel(pendingResolution.order.amount)}</p>
                </div>
              </div>
              <button onClick={() => !resolving && setPendingResolution(null)} disabled={resolving} className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-konami-text-muted hover:text-konami-text" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl mb-4" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9A3412' }}>Manual M-Pesa action required</p>
              <p className="text-sm font-semibold text-konami-text">{pendingResolution.plan.manualAction.title}</p>
              <p className="text-sm text-konami-text-dim leading-relaxed mt-1">{pendingResolution.plan.manualAction.detail}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPendingResolution(null)} disabled={resolving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#D1D5DB', color: '#374151' }}>
                Cancel
              </button>
              <button onClick={confirmResolution} disabled={resolving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: pendingResolution.resolution === 'refund' ? '#DC2626' : '#16A34A' }}>
                {resolving ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
            <p className="text-[11px] text-konami-text-muted mt-3">
              This records the resolution and posts it to the order chat. You must still complete the manual M-Pesa step above.
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
