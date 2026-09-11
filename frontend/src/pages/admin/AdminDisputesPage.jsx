import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDoc, doc, updateDoc, onSnapshot, increment, serverTimestamp, addDoc, deleteField } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { ADMIN_ROUTE } from '../../utils/constants';
import { formatKES, formatDate, formatRelativeTime } from '../../utils/formatters';
import { ExternalLink, CheckCircle, RotateCcw, X, MessageSquare, Scale, Search, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DISPUTE_RESOLUTIONS,
  DISPUTE_RESOLUTION_KEYS,
  buildDisputeResolution,
  formatKesLabel,
  resolutionLabelFor,
} from '../../services/disputeResolver';
import {
  getOrderMessagesRef,
  sendSystemMessage,
} from '../../services/chatService';

const DISPUTE_STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
};

function sortByDisputedAtDesc(a, b) {
  const aTime = a.disputedAt || a.updatedAt || a.createdAt;
  const bTime = b.disputedAt || b.updatedAt || b.createdAt;
  const aMs = aTime?.toDate ? aTime.toDate().getTime() : new Date(aTime || 0).getTime();
  const bMs = bTime?.toDate ? bTime.toDate().getTime() : new Date(bTime || 0).getTime();
  return bMs - aMs;
}

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

function StatusChip({ label, tone }) {
  const tones = {
    red: 'bg-red-50 text-konami-red border border-konami-red/30',
    amber: 'bg-amber-50 text-amber-700 border border-amber-300/40',
    green: 'bg-green-50 text-green-600 border border-green-300/40',
    blue: 'bg-blue-50 text-konami-blue border border-konami-blue/30',
  };
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${tones[tone] || tones.blue}`}>
      {label}
    </span>
  );
}

export default function AdminDisputesPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('open');
  const [openDisputes, setOpenDisputes] = useState([]);
  const [reviewDisputes, setReviewDisputes] = useState([]);
  const [resolvedDisputes, setResolvedDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [markingReview, setMarkingReview] = useState(false);
  const [pendingResolution, setPendingResolution] = useState(null);
  const [, setChatTick] = useState(0);
  const messagesRef = useRef({});
  const enriched = useRef(new Set());
  const resolvedStatusRef = useRef([]);
  const resolvedKeyRef = useRef([]);
  const activeRef = useRef(true);

  const mergeResolved = useCallback(() => {
    if (!activeRef.current) return;
    const seen = new Map();
    resolvedStatusRef.current.forEach((o) => seen.set(o.id, o));
    resolvedKeyRef.current.forEach((o) => seen.set(o.id, o));
    setResolvedDisputes(
      Array.from(seen.values()).sort(sortByDisputedAtDesc)
    );
    setLoading(false);
  }, []);

  const applyUserDetails = useCallback(async (orders) => {
    return Promise.all(
      orders.map(async (order) => {
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
      })
    );
  }, []);

  const enrich = useCallback((orders, setter) => {
    const pending = orders.filter((o) => !enriched.current.has(o.id));
    if (pending.length === 0) return;
    applyUserDetails(pending).then((details) => {
      details.forEach((d) => enriched.current.add(d.id));
      setter((prev) =>
        prev.map((o) => details.find((d) => d.id === o.id) || o)
      );
    });
  }, [applyUserDetails]);

  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    let active = true;
    activeRef.current = true;

    const qDisputed = query(ordersRef, where('status', '==', 'disputed'));
    const qResolvedStatus = query(ordersRef, where('disputeStatus', '==', 'resolved'));
    const qResolvedKey = query(ordersRef, where('disputeResolution', 'in', Array.from(DISPUTE_RESOLUTION_KEYS)));

    const handleError = (err) => {
      if (!active) return;
      console.error('Disputes query error:', err);
      setError(
        err?.code === 'permission-denied'
          ? 'You do not have permission to view disputes.'
          : 'Could not load disputes. If this keeps happening, ask the admin to add the required Firestore index.'
      );
      setLoading(false);
    };

    const unsubDisputed = onSnapshot(qDisputed, (snap) => {
      if (!active) return;
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const open = docs.filter((o) => o.disputeStatus !== 'under_review').sort(sortByDisputedAtDesc);
      const review = docs.filter((o) => o.disputeStatus === 'under_review').sort(sortByDisputedAtDesc);
      setOpenDisputes(open);
      setReviewDisputes(review);
      setLoading(false);
    }, handleError);

    const unsubResolvedStatus = onSnapshot(qResolvedStatus, (snap) => {
      if (!active) return;
      resolvedStatusRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      mergeResolved();
    }, handleError);

    const unsubResolvedKey = onSnapshot(qResolvedKey, (snap) => {
      if (!active) return;
      resolvedKeyRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      mergeResolved();
    }, handleError);

    return () => {
      active = false;
      activeRef.current = false;
      unsubDisputed();
      unsubResolvedStatus();
      unsubResolvedKey();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enrich parties once every order list has settled.
  useEffect(() => {
    enrich(openDisputes, setOpenDisputes);
    enrich(reviewDisputes, setReviewDisputes);
    enrich(resolvedDisputes, setResolvedDisputes);
  });

  // Realtime chat evidence for open / under-review disputes only.
  useEffect(() => {
    const ids = openDisputes.concat(reviewDisputes).map((o) => o.id);
    const unsubs = ids.map((id) =>
      onSnapshot(
        query(getOrderMessagesRef(id)),
        (snap) => {
          messagesRef.current[id] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setChatTick((t) => t + 1);
        },
        (err) => console.warn('Message subscription error:', err.code)
      )
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDisputes.map((o) => o.id).join(','), reviewDisputes.map((o) => o.id).join(',')]);

  const openResolution = (order, resolution) => {
    const plan = buildDisputeResolution(order, resolution, {
      actorId: currentUser?.uid || '',
      actorName: currentUser?.displayName || 'Admin',
      buyerPhone: order.paymentPhone || '',
      sellerPhone: order.sellerPhone || '',
    });
    setPendingResolution({ order, resolution, plan });
  };

  const handleMarkUnderReview = async (order) => {
    setMarkingReview(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        disputeStatus: 'under_review',
        adminReviewRequired: false,
        disputeUpdatedAt: serverTimestamp(),
        adminReviewerId: currentUser?.uid || '',
        adminReviewerName: currentUser?.displayName || 'Admin',
        updatedAt: serverTimestamp(),
      });
      setTab('review');
      toast.success('Dispute marked as under review.');
    } catch (err) {
      console.error('Mark under review error:', err);
      toast.error('Failed to mark dispute as under review');
    } finally {
      setMarkingReview(false);
    }
  };

  const notifyParty = async (userId, order, title, message) => {
    if (!userId) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type: 'dispute',
        orderId: order.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Notification error:', err);
    }
  };

  const confirmResolution = async () => {
    if (!pendingResolution) return;
    const { order, resolution, plan } = pendingResolution;
    setResolving(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), plan.orderPatch);
      if (resolution === 'release') {
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
        await notifyParty(order.sellerId, order, '✅ Payment Released',
          `The dispute for "${order.listingTitle || 'your listing'}" was resolved in your favour. ${formatKES(order.amount)} has been released to you. Complete the payout to your registered payout phone.`);
        await notifyParty(order.buyerId, order, 'Dispute Resolved',
          `Your dispute for "${order.listingTitle || ''}" was resolved in the seller's favour. The order is complete.`);
      } else {
        if (order.listingId) {
          await updateDoc(doc(db, 'listings', order.listingId), {
            status: 'active',
            reservedById: deleteField(),
            reservedAt: deleteField(),
            soldAt: deleteField(),
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
        await notifyParty(order.buyerId, order, '✅ Refund Issued',
          `Your dispute for "${order.listingTitle || 'your order'}" was resolved in your favour. ${formatKES(order.amount)} will be refunded back to your payment method.`);
        await notifyParty(order.sellerId, order, 'Dispute Resolved',
          `The dispute for "${order.listingTitle || ''}" was resolved in the buyer's favour. The order was refunded and your listing is now live again.`);
      }
      await sendSystemMessage(order.id, plan.systemMessage);
      toast.success(plan.manualAction.title + ' pending.');
      setPendingResolution(null);
    } catch (err) {
      console.error('Resolve dispute error:', err);
      toast.error('Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  const renderDisputeCard = (order, section) => {
    const messages = messagesRef.current[order.id] || [];
    const isReviewing = section === 'review';
    const isResolved = section === 'resolved';
    const resolutionKey = order.disputeResolution;
    const resolution = resolutionKey === DISPUTE_RESOLUTIONS.release.key ? 'release' : 'refund';

    return (
      <div key={order.id} className="bg-white border border-konami-mid-gray rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="text-xs text-konami-text-muted">Order ID</p>
            <p className="text-sm font-mono text-konami-text break-all">{order.id}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isResolved ? (
              <StatusChip label={`RESOLVED — ${resolutionLabelFor(resolutionKey)}`} tone="green" />
            ) : (
              <StatusChip
                label={isReviewing ? DISPUTE_STATUS_LABELS.under_review.toUpperCase() : DISPUTE_STATUS_LABELS.open.toUpperCase()}
                tone={isReviewing ? 'amber' : 'red'}
              />
            )}
            <span className="text-[10px] text-konami-text-muted">
              Raised {formatRelativeTime(order.disputedAt || order.updatedAt)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-konami-text-muted mb-1">Listing</p>
            <p className="text-sm text-konami-text">{order.listingTitle || '-'}</p>
          </div>
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
            <p className="text-xs text-konami-text-muted mb-1">Amount</p>
            <p className="font-heading text-lg font-bold text-konami-text">{formatKES(order.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-konami-text-muted mb-1">Date Raised</p>
            <p className="text-sm text-konami-text">{formatDate(order.disputedAt || order.updatedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-konami-text-muted mb-1">Payment Status</p>
            <span className="text-sm font-medium text-green-600 capitalize">{order.paymentStatus || 'paid'}</span>
          </div>
          <div>
            <p className="text-xs text-konami-text-muted mb-1">Escrow Status</p>
            <span className="text-sm font-medium text-konami-text capitalize">{order.escrowStatus || 'held'}</span>
          </div>
          <div>
            <p className="text-xs text-konami-text-muted mb-1">Disputed By</p>
            <p className="text-sm text-konami-text">
              {order.disputedBy ? (order.disputedBy === order.buyerId ? order.buyerName : order.buyerName) : order.buyerName}
            </p>
          </div>
        </div>

        {order.paymentReference && (
          <div className="mb-4 p-3 bg-konami-light-gray rounded-xl">
            <p className="text-xs text-konami-text-muted mb-0.5">Payment Reference</p>
            <p className="text-sm font-mono text-konami-text">{order.paymentReference}</p>
            {order.paymentProvider && (
              <p className="text-xs text-konami-text-muted mt-1">Provider: {order.paymentProvider}</p>
            )}
          </div>
        )}

        <div className="mb-4 p-3 bg-red-50 rounded-xl border border-konami-red/20">
          <p className="text-xs font-semibold text-konami-red mb-1">Dispute Reason</p>
          <p className="text-sm text-konami-text-dim">{order.disputeReason || 'No reason provided'}</p>
        </div>

        {isResolved && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-300/40">
            <p className="text-xs font-semibold text-green-700 mb-1">
              Resolution: {resolutionLabelFor(order.disputeResolution)} ({formatDate(order.disputeResolvedAt || order.resolvedAt)})
            </p>
            <p className="text-sm text-konami-text-dim">
              {resolution === 'refund'
                ? `Refunded ${formatKES(order.amount)} to the buyer. Manual refund confirmation pending.`
                : `Released ${formatKES(order.amount)} to the seller. Manual payout confirmation pending.`}
            </p>
            {order.disputeResolvedBy && (
              <p className="text-xs text-konami-text-muted mt-1">
                Resolved by {order.disputeResolvedByName || 'Admin'} (ID: {order.disputeResolvedBy.slice(0, 12)}...)
              </p>
            )}
          </div>
        )}

        {!isResolved && (
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
        )}

        {isResolved ? (
          <div className="pt-3 border-t border-konami-mid-gray">
            <button
              onClick={() => navigate(`${ADMIN_ROUTE}/orders`)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors"
              style={{ borderColor: '#D1D5DB', color: '#374151' }}
            >
              <ExternalLink size={14} /> View in Orders
            </button>
          </div>
        ) : (
          <div className="flex gap-3 pt-3 border-t border-konami-mid-gray">
            <button
              onClick={() => navigate(`${ADMIN_ROUTE}/orders`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
              style={{ borderColor: '#D1D5DB', color: '#374151' }}
            >
              <Eye size={15} /> View Order
            </button>
            {isReviewing ? (
              <>
                <button
                  onClick={() => openResolution(order, 'release')}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} /> Release to Seller
                </button>
                <button
                  onClick={() => openResolution(order, 'refund')}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> Refund Buyer
                </button>
              </>
            ) : (
              <button
                onClick={() => handleMarkUnderReview(order)}
                disabled={markingReview}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-konami-blue text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Search size={16} /> {markingReview ? 'Marking...' : 'Review'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const countLabel = (list) => (list.length > 0 ? ` (${list.length})` : '');

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-heading text-xl font-bold text-konami-text">Dispute Resolution</h2>
        <div className="flex gap-1 bg-konami-light-gray rounded-lg p-1">
          <button
            onClick={() => setTab('open')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${tab === 'open' ? 'bg-white text-konami-blue shadow-sm' : 'text-konami-text-muted hover:text-konami-text'}`}
          >
            Open{countLabel(openDisputes)}
          </button>
          <button
            onClick={() => setTab('review')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${tab === 'review' ? 'bg-white text-konami-blue shadow-sm' : 'text-konami-text-muted hover:text-konami-text'}`}
          >
            Under Review{countLabel(reviewDisputes)}
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${tab === 'resolved' ? 'bg-white text-konami-blue shadow-sm' : 'text-konami-text-muted hover:text-konami-text'}`}
          >
            Resolved{countLabel(resolvedDisputes)}
          </button>
        </div>
      </div>

      <div className="mb-4 p-4 rounded-xl bg-konami-blue/5 border border-konami-blue/20">
        <p className="text-sm text-konami-text-dim leading-relaxed">
          Open and under-review disputes are streamed live — they appear here the moment a buyer raises them. Review the order chat below, then choose a resolution. Funds are only ever moved after you complete the corresponding <strong>manual payment action</strong> shown at confirmation — there is no automated payout or reversal in this system.
        </p>
        <div className="mt-3 grid sm:grid-cols-3 gap-3">
          {[
            ['1', 'Read the chat', 'The chat inside the order is the evidence record — buyer, seller, and admin messages all count.'],
            ['2', 'Judge the facts', 'Full refund to the buyer, or release to the seller. There is no partial split in this system.'],
            ['3', 'Complete the action', 'Confirm the resolution — then do the manual payout or reversal action shown.'],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-xl p-3 flex gap-2.5" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #D3DDFF' }}>
              <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: '#003BFF', color: '#FFF100' }}>{n}</span>
              <p className="text-xs text-konami-text-dim leading-relaxed"><strong className="text-konami-text">{t}:</strong> {d}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #C8102E' }}>
          <p className="text-sm font-semibold" style={{ color: '#C8102E' }}>Disputes could not be loaded</p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
            style={{ background: '#C8102E', color: '#FFFFFF' }}
          >
            RETRY
          </button>
        </div>
      )}

      {loading && !error ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
        </div>
      ) : tab === 'open' ? (
        openDisputes.length === 0 ? (
          <div className="text-center py-12">
            <Scale size={40} className="mx-auto mb-3 text-konami-text-muted" />
            <p className="text-konami-text-muted text-sm">No open disputes. Everything looks good.</p>
          </div>
        ) : (
          <div className="space-y-4">{openDisputes.map((o) => renderDisputeCard(o, 'open'))}</div>
        )
      ) : tab === 'review' ? (
        reviewDisputes.length === 0 ? (
          <div className="text-center py-12">
            <Search size={40} className="mx-auto mb-3 text-konami-text-muted" />
            <p className="text-konami-text-muted text-sm">Nothing under review right now.</p>
          </div>
        ) : (
          <div className="space-y-4">{reviewDisputes.map((o) => renderDisputeCard(o, 'review'))}</div>
        )
      ) : (
        resolvedDisputes.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={40} className="mx-auto mb-3 text-konami-text-muted" />
            <p className="text-konami-text-muted text-sm">No resolved disputes yet.</p>
          </div>
        ) : (
          <div className="space-y-4">{resolvedDisputes.map((o) => renderDisputeCard(o, 'resolved'))}</div>
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

            {pendingResolution.order.disputeReason && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-konami-red/20">
                <p className="text-xs font-semibold text-konami-red mb-1">Dispute Reason</p>
                <p className="text-sm text-konami-text-dim">{pendingResolution.order.disputeReason}</p>
              </div>
            )}

            <div className="p-4 rounded-xl mb-4" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9A3412' }}>Manual payment action required</p>
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
              This closes the dispute, records the resolution, and notifies both parties. You must still complete the manual payment step above.
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}