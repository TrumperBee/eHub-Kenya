import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { ORDER_STATUS } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';
import { ChevronDown, ChevronUp, CheckCircle, RotateCcw, X } from 'lucide-react';
import { resolveOrder } from '../../services/paymentService';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'awaiting', label: 'Awaiting Delivery' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'completed', label: 'Completed' },
];

const matchesFilter = (order, filterId) => {
  const status = order.status;
  switch (filterId) {
    case 'pending':
      return ['pending_payment', 'payment_pending'].includes(status);
    case 'awaiting':
      return [
        'awaiting_seller_delivery',
        'credentials_submitted',
        'payment_confirmed',
        'in_transfer',
      ].includes(status);
    case 'disputed':
      return status === 'disputed';
    case 'completed':
      return status === 'completed';
    default:
      return true;
  }
};

export default function AdminOrdersPage({ embedded = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [acting, setActing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')))
      .then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const handleReleaseEscrow = async (order) => {
    setActing(true);
    try {
      // Server-side: writes order/listing/chat, updates stats + notifications,
      // and sends the order-completed emails. Manual payout stays with admin.
      await resolveOrder(order.id, 'release');
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
      await resolveOrder(order.id, 'refund');
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'refunded', escrowStatus: 'refunded' } : o));
      toast.success('Order marked refunded. Complete the refund in the ZetuPay dashboard.');
    } catch {
      toast.error('Failed to refund order');
    } finally {
      setActing(false);
      setPendingAction(null);
    }
  };

  const filtered = orders.filter((order) => matchesFilter(order, filter));
  const countFor = (id) => orders.filter((order) => matchesFilter(order, id)).length;

  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-heading text-lg font-bold text-konami-text">All Orders</h2>
          <p className="text-xs text-konami-text-muted mt-0.5">
            {orders.length} orders · escrow actions are final and notify both parties.
          </p>
        </div>
        <div className="flex gap-1 bg-konami-light-gray rounded-lg p-1 flex-wrap">
          {FILTERS.map((item) => {
            const count = countFor(item.id);
            const isDisputedChip = item.id === 'disputed';
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  active
                    ? isDisputedChip
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white text-konami-blue shadow-sm'
                    : isDisputedChip && count > 0
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-konami-text-muted hover:text-konami-text'
                }`}
              >
                {item.label}{count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-konami-text-muted text-sm">
          {orders.length === 0 ? 'No orders yet.' : 'No orders match this filter.'}
        </p>
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
              {filtered.map((order) => {
                const cfg = ORDER_STATUS[order.status] || {};
                const isExpanded = expanded === order.id;
                const isDisputed = order.status === 'disputed';
                const canRelease = [
                  'disputed',
                  'payment_confirmed',
                  'awaiting_seller_delivery',
                  'credentials_submitted',
                ].includes(order.status);
                return (
                  <React.Fragment key={order.id}>
                    <tr
                      className={`transition-colors ${
                        isDisputed
                          ? 'bg-red-50 hover:bg-red-100/70 border-l-4 border-l-konami-red'
                          : 'hover:bg-konami-light-gray'
                      }`}
                    >
                      <td className={`py-3 text-sm font-mono ${isDisputed ? 'pl-2 text-konami-red font-semibold' : 'text-konami-text-dim'}`}>{order.id?.slice(0, 8)}...</td>
                      <td className="py-3 text-sm text-konami-text">{order.buyerDisplayName || '-'}</td>
                      <td className="py-3 text-sm text-konami-text">{order.sellerDisplayName || '-'}</td>
                      <td className="py-3 text-sm text-konami-text-dim max-w-[150px] truncate">{order.listingTitle || '-'}</td>
                      <td className="py-3 text-sm font-semibold text-konami-text">{formatKES(order.amount)}</td>
                      <td className="py-3 text-sm font-mono text-konami-text-dim">{order.paymentReference || '-'}</td>
                      <td className="py-3 text-sm text-konami-text-dim capitalize">{order.paymentChannel ? order.paymentChannel.replace('_', ' ') : '-'}</td>
                      <td className="py-3">
                        <span className={`text-xs font-semibold ${isDisputed ? 'text-konami-red' : cfg.color || 'text-konami-text-dim'}`}>{cfg.label || order.status}</span>
                      </td>
                      <td className="py-3 text-sm text-konami-text-dim">{order.escrowStatus || '-'}</td>
                      <td className="py-3 text-sm text-konami-text-dim">{formatDate(order.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setExpanded(isExpanded ? null : order.id)} className="px-2 py-1 text-xs bg-konami-light-gray text-konami-text-dim rounded-lg border border-konami-mid-gray hover:text-konami-text transition-colors">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {canRelease && (
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
                            <p><span className="text-konami-text-muted">Payment Reference:</span> {order.paymentReference || order.zetupayReference || '-'}</p>
                            <p><span className="text-konami-text-muted">Payment Provider:</span> {order.paymentProvider || 'zetupay'}</p>
                            <p><span className="text-konami-text-muted">Payment Status:</span> {order.paymentStatus || '-'}</p>
                            <p><span className="text-konami-text-muted">ZetuPay Tx ID:</span> {order.paymentTransactionId || order.zetupayTransactionId || '-'}</p>
                            {order.disputeReason && <p><span className="text-konami-text-muted">Dispute Reason:</span> {order.disputeReason}</p>}
                            <p><span className="text-konami-text-muted">Contact Phone:</span> {order.paymentPhone || '-'}</p>
                            {isDisputed && order.paymentReference && (
                              <p className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                                Refunds are done manually in ZetuPay: search reference <span className="font-mono">"{order.paymentReference || order.zetupayReference}"</span>, issue the refund, then mark the order Refunded.
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
                  Complete the {pendingAction.type === 'refund' ? 'refund' : 'payout'} manually: ZetuPay dashboard → search reference{' '}
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
    </>
  );

  return embedded ? content : <AdminLayout>{content}</AdminLayout>;
}
