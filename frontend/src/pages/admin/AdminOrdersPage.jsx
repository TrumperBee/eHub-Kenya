import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc, addDoc, serverTimestamp, increment, deleteField } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { ORDER_STATUS } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';
import { ChevronDown, ChevronUp, CheckCircle, RotateCcw, X } from 'lucide-react';
import { sendSystemMessage } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { DISPUTE_RESOLUTIONS } from '../../services/disputeResolver';

const notifyParty = async (userId, order, title, message) => {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type: 'order',
      orderId: order.id,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Notification error:', err);
  }
};

export default function AdminOrdersPage() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')))
      .then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const auditResolution = (resolutionKey) => ({
    disputeStatus: 'resolved',
    disputeResolution: resolutionKey,
    disputeResolvedAt: new Date().toISOString(),
    disputeResolvedBy: currentUser?.uid || '',
    disputeResolvedByName: currentUser?.displayName || 'Admin',
    disputeUpdatedAt: new Date().toISOString(),
    adminReviewRequired: false,
  });

  const handleReleaseEscrow = async (order) => {
    setActing(true);
    try {
      const actor = auditResolution(DISPUTE_RESOLUTIONS.release.key);
      const patch = {
        status: 'completed',
        escrowStatus: 'released',
        updatedAt: new Date().toISOString(),
      };
      if (order.status === 'disputed') Object.assign(patch, actor);
      await updateDoc(doc(db, 'orders', order.id), patch);
      if (order.listingId) {
        await updateDoc(doc(db, 'listings', order.listingId), {
          status: 'sold',
          reservedById: deleteField(),
          reservedAt: deleteField(),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
      if (order.sellerId) {
        await updateDoc(doc(db, 'users', order.sellerId), { totalSales: increment(1) }).catch(() => {});
      }
      await sendSystemMessage(order.id, 'Escrow released by admin. Order completed — payout pending.');
      await notifyParty(order.sellerId, order, 'Escrow Released',
        `Escrow for "${order.listingTitle || 'your listing'}" (${formatKES(order.amount)}) was released to you. Complete the payout to your registered payout phone.`);
      await notifyParty(order.buyerId, order, 'Order Completed',
        `Your order "${order.listingTitle || ''}" was completed. Thank you for shopping with eHub Kenya.`);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed', escrowStatus: 'released' } : o));
      toast.success('Escrow released. Order completed.');
    } catch {
      toast.error('Failed to release escrow');
    } finally {
      setActing(false);
      setPendingAction(null);
    }
  };

  const handleRefund = async (order) => {
    setActing(true);
    try {
      const actor = auditResolution(DISPUTE_RESOLUTIONS.refund.key);
      const patch = {
        status: 'refunded',
        escrowStatus: 'refunded',
        updatedAt: new Date().toISOString(),
      };
      if (order.status === 'disputed') Object.assign(patch, actor);
      await updateDoc(doc(db, 'orders', order.id), patch);
      if (order.listingId) {
        await updateDoc(doc(db, 'listings', order.listingId), {
          status: 'active',
          reservedById: deleteField(),
          reservedAt: deleteField(),
          soldAt: deleteField(),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
      await sendSystemMessage(order.id, 'Order refunded by admin. The listing has been re-listed.');
      await notifyParty(order.buyerId, order, 'Refund Issued',
        `Your refund of ${formatKES(order.amount)} for "${order.listingTitle || 'your order'}" has been approved. It will be sent back to your payment method.`);
      await notifyParty(order.sellerId, order, 'Order Refunded',
        `The order "${order.listingTitle || ''}" was refunded to the buyer. Your listing is now live again.`);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'refunded', escrowStatus: 'refunded' } : o));
      toast.success('Order marked refunded. Complete the refund in the Paystack dashboard.');
    } catch {
      toast.error('Failed to refund order');
    } finally {
      setActing(false);
      setPendingAction(null);
    }
  };

  return (
    <AdminLayout>
      <h2 className="font-heading text-xl font-bold text-konami-text mb-6">All Orders</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-konami-text-muted text-sm">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-konami-mid-gray text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Order ID</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Buyer</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Seller</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Listing</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Amount</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Payment Ref</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Channel</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Status</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Escrow</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Date</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-konami-mid-gray">
              {orders.map((order) => {
                const cfg = ORDER_STATUS[order.status] || {};
                const isExpanded = expanded === order.id;
                const isDisputed = order.status === 'disputed';
                return (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-konami-light-gray transition-colors">
                      <td className="py-3 text-sm font-mono text-konami-text-dim">{order.id?.slice(0, 8)}...</td>
                      <td className="py-3 text-sm text-konami-text">{order.buyerDisplayName || '-'}</td>
                      <td className="py-3 text-sm text-konami-text">{order.sellerDisplayName || '-'}</td>
                      <td className="py-3 text-sm text-konami-text-dim max-w-[150px] truncate">{order.listingTitle || '-'}</td>
                      <td className="py-3 text-sm font-semibold text-konami-text">{formatKES(order.amount)}</td>
                      <td className="py-3 text-sm font-mono text-konami-text-dim">{order.paymentReference || '-'}</td>
                      <td className="py-3 text-sm text-konami-text-dim capitalize">{order.paymentChannel ? order.paymentChannel.replace('_', ' ') : '-'}</td>
                      <td className="py-3">
                        <span className={`text-xs ${cfg.color || 'text-konami-text-dim'}`}>{cfg.label || order.status}</span>
                      </td>
                      <td className="py-3 text-sm text-konami-text-dim">{order.escrowStatus || '-'}</td>
                      <td className="py-3 text-sm text-konami-text-dim">{formatDate(order.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setExpanded(isExpanded ? null : order.id)} className="px-2 py-1 text-xs bg-konami-light-gray text-konami-text-dim rounded-lg border border-konami-mid-gray hover:text-konami-text transition-colors">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {(isDisputed || order.status === 'payment_confirmed') && (
                            <button onClick={() => setPendingAction({ order, type: 'release' })} className="px-2 py-1 text-xs bg-green-600/20 text-green-500 rounded-lg border border-green-400/30 hover:bg-green-600/30 transition-colors">
                              Release
                            </button>
                          )}
                          {isDisputed && (
                            <button onClick={() => setPendingAction({ order, type: 'refund' })} className="px-2 py-1 text-xs bg-red-600/20 text-red-500 rounded-lg border border-red-400/30 hover:bg-red-600/30 transition-colors">
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${order.id}-expanded`}>
                        <td colSpan={11} className="px-4 py-3 bg-gray-50">
                          <div className="text-xs text-konami-text-dim space-y-1">
                            <p><span className="text-konami-text-muted">Payment Reference:</span> {order.paymentReference || '-'}</p>
                            <p><span className="text-konami-text-muted">Payment Provider:</span> {order.paymentProvider || 'Paystack'}</p>
                            <p><span className="text-konami-text-muted">Payment Status:</span> {order.paymentStatus || '-'}</p>
                            <p><span className="text-konami-text-muted">Paystack Tx ID:</span> {order.paymentTransactionId || '-'}</p>
                            {order.disputeReason && <p><span className="text-konami-text-muted">Dispute Reason:</span> {order.disputeReason}</p>}
                            <p><span className="text-konami-text-muted">Contact Phone:</span> {order.paymentPhone || '-'}</p>
                            {isDisputed && order.paymentReference && (
                              <p className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                                Refunds are done manually in Paystack: dashboard.paystack.com → Transactions → search reference <span className="font-mono">"{order.paymentReference}"</span> → Issue Refund. Then mark the order Refunded.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    {pendingAction && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !acting && setPendingAction(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: pendingAction.type === 'refund' ? '#FEE2E2' : '#DCFCE7', color: pendingAction.type === 'refund' ? '#DC2626' : '#16A34A' }}>
                  {pendingAction.type === 'refund' ? <RotateCcw size={20} /> : <CheckCircle size={20} />}
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-konami-text">
                    {pendingAction.type === 'refund' ? 'Refund Buyer' : 'Release to Seller'}
                  </h3>
                  <p className="text-xs text-konami-text-muted">{formatKES(pendingAction.order.amount)} — {pendingAction.order.listingTitle || 'Untitled'}</p>
                </div>
              </div>
              <button onClick={() => !acting && setPendingAction(null)} disabled={acting} className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-konami-text-muted hover:text-konami-text" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className={`p-4 rounded-xl mb-4 ${pendingAction.order.status === 'disputed' ? 'bg-red-50 border border-konami-red/20' : ''}`}>
              <p className="text-sm text-konami-text-dim leading-relaxed">
                {pendingAction.type === 'refund'
                  ? `Mark order as refunded and send ${formatKES(pendingAction.order.amount)} back to the buyer. The listing will be re-listed as active.`
                  : `Mark order as completed and release the escrowed ${formatKES(pendingAction.order.amount)} to the seller. This increments the seller's sales count.`}
              </p>
              {pendingAction.order.status === 'disputed' && (
                <p className="mt-2 text-sm font-semibold" style={{ color: '#C8102E' }}>
                  {pendingAction.type === 'refund' ? 'Resolve the dispute in favour of the buyer.' : 'Resolve the dispute in favour of the seller.'}
                </p>
              )}
              {pendingAction.order.paymentReference && (
                <p className="mt-2 text-xs text-konami-text-muted">
                  Complete the {pendingAction.type === 'refund' ? 'refund' : 'payout'} manually: Paystack dashboard → search reference{' '}
                  <span className="font-mono">"{pendingAction.order.paymentReference}"</span>
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPendingAction(null)} disabled={acting} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#D1D5DB', color: '#374151' }}>
                Cancel
              </button>
              <button
                onClick={() => pendingAction.type === 'refund' ? handleRefund(pendingAction.order) : handleReleaseEscrow(pendingAction.order)}
                disabled={acting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: pendingAction.type === 'refund' ? '#DC2626' : '#16A34A' }}
              >
                {acting ? 'Applying...' : 'Confirm'}
              </button>
            </div>
            <p className="text-[11px] text-konami-text-muted mt-3">
              {pendingAction.order.status === 'disputed'
                ? 'This closes the dispute, records the resolution, and notifies both parties.'
                : 'This will also post a message to the order chat.'}
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
