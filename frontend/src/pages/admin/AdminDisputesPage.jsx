import TableSkeleton from '../../components/admin/TableSkeleton';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { ADMIN_ROUTE } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  KeyRound,
  MessageSquare,
  RotateCcw,
  Scale,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DISPUTE_RESOLUTION_KEYS,
  buildDisputeResolution,
  formatKesLabel,
  resolutionLabelFor,
} from '../../services/disputeResolver';
import { getOrderMessagesRef } from '../../services/chatService';
import { resolveOrder } from '../../services/paymentService';

const DISPUTE_STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
};

function sortByDisputedAtDesc(a, b) {
  const aTime = a.disputeRaisedAt || a.disputedAt || a.updatedAt || a.createdAt;
  const bTime = b.disputeRaisedAt || b.disputedAt || b.updatedAt || b.createdAt;
  const aMs = aTime?.toDate ? aTime.toDate().getTime() : new Date(aTime || 0).getTime();
  const bMs = bTime?.toDate ? bTime.toDate().getTime() : new Date(bTime || 0).getTime();
  return bMs - aMs;
}

function StatusChip({ label, tone }) {
  const tones = {
    red: 'bg-red-50 text-konami-red border border-konami-red/30',
    amber: 'bg-amber-50 text-amber-700 border border-amber-300/40',
    green: 'bg-green-50 text-green-600 border border-green-300/40',
    blue: 'bg-blue-50 text-konami-blue border border-konami-blue/30',
  };
  return (
    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap ${tones[tone] || tones.blue}`}>
      {label}
    </span>
  );
}

function statusOf(order) {
  if (order.disputeStatus === 'resolved') return 'resolved';
  if (order.disputeStatus === 'under_review') return 'under_review';
  return 'open';
}

export default function AdminDisputesPage({ embedded = false }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('open');
  const [openDisputes, setOpenDisputes] = useState([]);
  const [reviewDisputes, setReviewDisputes] = useState([]);
  const [resolvedDisputes, setResolvedDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [adminNote, setAdminNote] = useState('');
  const [pendingResolution, setPendingResolution] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [markingReview, setMarkingReview] = useState(false);

  const enriched = useRef(new Set());
  const resolvedStatusRef = useRef([]);
  const resolvedKeyRef = useRef([]);
  const activeRef = useRef(true);

  /* ---------------------------------------------------------------- loading */

  const mergeResolved = useCallback(() => {
    if (!activeRef.current) return;
    const seen = new Map();
    resolvedStatusRef.current.forEach((o) => seen.set(o.id, o));
    resolvedKeyRef.current.forEach((o) => seen.set(o.id, o));
    setResolvedDisputes(Array.from(seen.values()).sort(sortByDisputedAtDesc));
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

  const enrich = useCallback(
    (orders, setter) => {
      const pending = orders.filter((o) => !enriched.current.has(o.id));
      if (pending.length === 0) return;
      applyUserDetails(pending).then((details) => {
        details.forEach((d) => enriched.current.add(d.id));
        setter((prev) => prev.map((o) => details.find((d) => d.id === o.id) || o));
      });
    },
    [applyUserDetails]
  );

  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    let active = true;
    activeRef.current = true;

    const qDisputed = query(ordersRef, where('status', '==', 'disputed'));
    const qResolvedStatus = query(ordersRef, where('disputeStatus', '==', 'resolved'));
    const qResolvedKey = query(
      ordersRef,
      where('disputeResolution', 'in', Array.from(DISPUTE_RESOLUTION_KEYS))
    );

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

    const unsubDisputed = onSnapshot(
      qDisputed,
      (snap) => {
        if (!active) return;
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOpenDisputes(
          docs.filter((o) => statusOf(o) === 'open').sort(sortByDisputedAtDesc)
        );
        setReviewDisputes(
          docs.filter((o) => statusOf(o) === 'under_review').sort(sortByDisputedAtDesc)
        );
        setLoading(false);
      },
      handleError
    );

    const unsubResolvedStatus = onSnapshot(
      qResolvedStatus,
      (snap) => {
        if (!active) return;
        resolvedStatusRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        mergeResolved();
      },
      handleError
    );

    const unsubResolvedKey = onSnapshot(
      qResolvedKey,
      (snap) => {
        if (!active) return;
        resolvedKeyRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        mergeResolved();
      },
      handleError
    );

    return () => {
      active = false;
      activeRef.current = false;
      unsubDisputed();
      unsubResolvedStatus();
      unsubResolvedKey();
    };
  }, [mergeResolved]);

  useEffect(() => {
    enrich(openDisputes, setOpenDisputes);
    enrich(reviewDisputes, setReviewDisputes);
    enrich(resolvedDisputes, setResolvedDisputes);
  }, [enrich, openDisputes, reviewDisputes, resolvedDisputes]);

  // Keep the open detail view live as the order changes.
  useEffect(() => {
    if (!selected?.id) return undefined;
    const unsub = onSnapshot(
      doc(db, 'orders', selected.id),
      (snap) => {
        if (snap.exists()) setSelected({ id: snap.id, ...snap.data() });
      },
      (err) => console.warn('Selected order subscription error:', err.code)
    );
    return unsub;
  }, [selected?.id]);

  /* ------------------------------------------------------- detail data load */

  useEffect(() => {
    if (!selected?.id) return undefined;
    let active = true;

    // Account credentials the seller submitted, so the admin can compare them
    // with the buyer's complaint.
    getDocs(
      query(collection(db, 'orders', selected.id, 'delivery'), orderBy('createdAt', 'desc'), limit(1))
    )
      .then((snap) => {
        if (active) setCredentials(snap.docs[0]?.data() || null);
      })
      .catch((err) => {
        console.warn('Delivery read error:', err.code);
        if (active) setCredentials(null);
      })
      .finally(() => {
        if (active) setCredentialsLoading(false);
      });

    const unsub = onSnapshot(
      getOrderMessagesRef(selected.id),
      (snap) => {
        if (active) setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.warn('Message subscription error:', err.code)
    );

    return () => {
      active = false;
      unsub();
    };
  }, [selected?.id]);

  /* --------------------------------------------------------------- actions */

  const openDispute = (order) => {
    setPendingResolution(null);
    setSelected(order);
    setAdminNote(order.adminNote || '');
    setCredentials(null);
    setCredentialsLoading(true);
    setMessages([]);
  };

  const closeDetail = () => {
    if (resolving) return;
    setSelected(null);
    setPendingResolution(null);
    setAdminNote('');
    setCredentials(null);
    setCredentialsLoading(false);
    setMessages([]);
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

  const openResolution = (order, resolution) => {
    const plan = buildDisputeResolution(order, resolution, {
      actorId: currentUser?.uid || '',
      actorName: currentUser?.displayName || 'Admin',
      buyerPhone: order.paymentPhone || '',
      sellerPhone: order.sellerPhone || '',
    });
    setPendingResolution({ order, resolution, plan });
  };

  const confirmResolution = async () => {
    if (!pendingResolution) return;
    const { order, resolution } = pendingResolution;
    setResolving(true);
    try {
      // Server-side resolution: writes the order/listing/chat atomically,
      // updates the dispute record, notifications and emails. The manual
      // payout/refund action stays with the admin.
      await resolveOrder(order.id, resolution, adminNote.trim());
      toast.success(pendingResolution.plan.manualAction.title + ' pending.');
      setPendingResolution(null);
      setSelected(null);
    } catch (err) {
      console.error('Resolve dispute error:', err);
      toast.error(err?.response?.data?.error || 'Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  /* ----------------------------------------------------------------- render */

  const rows =
    tab === 'open' ? openDisputes : tab === 'review' ? reviewDisputes : resolvedDisputes;

  const countLabel = (list) => (list.length > 0 ? ` (${list.length})` : '');

  const reasonFor = (order) => order.disputeReason || order.disputeDetails || 'No reason provided';

  const content = (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-konami-text">Disputes</h2>
          <p className="text-xs text-konami-text-muted mt-1">
            Every buyer dispute opens with escrow frozen. Review the case, then release or refund.
          </p>
        </div>
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
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div className="bg-white border border-konami-mid-gray rounded-xl text-center py-12">
          <Scale size={40} className="mx-auto mb-3 text-konami-text-muted" />
          <p className="text-konami-text-muted text-sm">
            {tab === 'open'
              ? 'No open disputes. Everything looks good.'
              : tab === 'review'
                ? 'Nothing under review right now.'
                : 'No resolved disputes yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-konami-mid-gray rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-sm">
              <thead>
                <tr className="bg-konami-light-gray text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Order ID</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Listing Title</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap">Amount (KES)</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Buyer</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Seller</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Reason</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap">Date Raised</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-konami-mid-gray">
                {rows.map((order) => {
                  const status = statusOf(order);
                  return (
                    <tr key={order.id} className="hover:bg-konami-light-gray/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-konami-text whitespace-nowrap">
                        {order.id.slice(0, 10)}…
                      </td>
                      <td className="px-4 py-3 text-konami-text max-w-[220px] truncate">
                        {order.listingTitle || '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-konami-text whitespace-nowrap">
                        {formatKES(order.amount)}
                      </td>
                      <td className="px-4 py-3 text-konami-text-dim">{order.buyerName || '-'}</td>
                      <td className="px-4 py-3 text-konami-text-dim">{order.sellerName || '-'}</td>
                      <td className="px-4 py-3 text-konami-text-dim max-w-[200px] truncate">
                        {reasonFor(order)}
                      </td>
                      <td className="px-4 py-3 text-konami-text-dim whitespace-nowrap">
                        {formatDate(order.disputeRaisedAt || order.disputedAt || order.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip
                          label={DISPUTE_STATUS_LABELS[status].toUpperCase()}
                          tone={status === 'resolved' ? 'green' : status === 'under_review' ? 'amber' : 'red'}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openDispute(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
                          style={{ borderColor: '#D1D5DB', color: '#374151' }}
                        >
                          <Search size={13} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeDetail}
        >
          <div
            className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading text-lg font-bold text-konami-text">
                      {selected.listingTitle || 'Disputed order'}
                    </h3>
                    <StatusChip
                      label={DISPUTE_STATUS_LABELS[statusOf(selected)].toUpperCase()}
                      tone={statusOf(selected) === 'resolved' ? 'green' : statusOf(selected) === 'under_review' ? 'amber' : 'red'}
                    />
                  </div>
                  <p className="text-xs font-mono text-konami-text-muted mt-1 break-all">Order {selected.id}</p>
                </div>
                <button
                  onClick={closeDetail}
                  disabled={resolving}
                  aria-label="Close dispute details"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-konami-text-muted hover:text-konami-text disabled:opacity-60"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-konami-text-muted mb-0.5">Amount</p>
                  <p className="font-heading text-lg font-bold text-konami-text">{formatKES(selected.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-konami-text-muted mb-0.5">Date raised</p>
                  <p className="text-sm text-konami-text">
                    {formatDate(selected.disputeRaisedAt || selected.disputedAt || selected.updatedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-konami-text-muted mb-0.5">Escrow</p>
                  <p className="text-sm text-konami-text capitalize">{selected.escrowStatus || 'held'}</p>
                </div>
                <div>
                  <p className="text-xs text-konami-text-muted mb-0.5">Buyer</p>
                  <p className="text-sm text-konami-text">{selected.buyerName || '-'}</p>
                  {selected.buyerEmail && <p className="text-xs text-konami-text-muted break-all">{selected.buyerEmail}</p>}
                  {selected.paymentPhone && <p className="text-xs text-konami-text-muted font-mono">{selected.paymentPhone}</p>}
                </div>
                <div>
                  <p className="text-xs text-konami-text-muted mb-0.5">Seller</p>
                  <p className="text-sm text-konami-text">{selected.sellerName || '-'}</p>
                  {selected.sellerEmail && <p className="text-xs text-konami-text-muted break-all">{selected.sellerEmail}</p>}
                  {selected.sellerPhone && <p className="text-xs text-konami-text-muted font-mono">{selected.sellerPhone}</p>}
                </div>
                <div>
                  <p className="text-xs text-konami-text-muted mb-0.5">Payment reference</p>
                  <p className="text-sm font-mono text-konami-text break-all">{selected.paymentReference || '-'}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-50 border border-konami-red/20">
                <p className="text-xs font-semibold text-konami-red mb-1">Buyer's reason</p>
                <p className="text-sm font-medium text-konami-text">{selected.disputeReason || 'No reason provided'}</p>
                {selected.disputeDetails && (
                  <p className="text-sm text-konami-text-dim mt-2 whitespace-pre-wrap">{selected.disputeDetails}</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-konami-text-muted mb-2 flex items-center gap-1.5">
                  <KeyRound size={12} /> Account credentials submitted
                </p>
                {credentialsLoading ? (
                  <p className="text-xs text-konami-text-muted">Loading…</p>
                ) : credentials ? (
                  <div className="p-3 bg-konami-light-gray rounded-xl space-y-1.5">
                    <p className="text-xs text-konami-text-dim">
                      <span className="text-konami-text-muted">Email:</span>{' '}
                      <span className="break-all">{credentials.accountEmail || '-'}</span>
                    </p>
                    <p className="text-xs text-konami-text-dim">
                      <span className="text-konami-text-muted">Password:</span>{' '}
                      <span className="font-mono break-all">{credentials.accountPassword || '-'}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-konami-text-muted">The seller has not submitted account details.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-konami-text-muted mb-2 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Order chat ({messages.length})
                </p>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto p-3 bg-konami-light-gray rounded-xl">
                  {messages.length === 0 ? (
                    <p className="text-xs text-konami-text-muted">No messages in this order.</p>
                  ) : (
                    messages.map((msg) => {
                      const isSystem =
                        msg.messageType === 'system' || msg.senderRole === 'system' || msg.type === 'system';
                      const content = msg.content || msg.text || '';
                      return (
                        <p key={msg.id} className={`text-xs ${isSystem ? 'italic text-konami-text-muted' : 'text-konami-text-dim'}`}>
                          {!isSystem && (
                            <span className="text-konami-text-muted font-medium">
                              {msg.senderDisplayName || msg.senderRole || 'User'}:{' '}
                            </span>
                          )}
                          {content}
                        </p>
                      );
                    })
                  )}
                </div>
              </div>

              {selected.disputeStatus === 'resolved' ? (
                <div className="p-4 rounded-xl bg-green-50 border border-green-300/40">
                  <p className="text-xs font-semibold text-green-700 mb-1">
                    Resolved — {resolutionLabelFor(selected.disputeResolution)} ({formatDate(selected.resolvedAt || selected.disputeResolvedAt)})
                  </p>
                  <p className="text-sm text-konami-text-dim">
                    {selected.adminNote || 'No admin note recorded.'}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="admin-note" className="block text-xs font-semibold text-konami-text-muted mb-1.5">
                      Admin note (optional)
                    </label>
                    <textarea
                      id="admin-note"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={3}
                      placeholder="Record why you reached this decision. This is stored with the dispute."
                      className="w-full bg-konami-light-gray border border-konami-mid-gray rounded-xl px-3 py-2.5 text-sm text-konami-text outline-none focus:border-konami-blue transition-colors resize-none"
                    />
                  </div>

                  {pendingResolution ? (
                    <div className="p-4 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9A3412' }}>
                        Manual payment action required
                      </p>
                      <p className="text-sm font-semibold text-konami-text">{pendingResolution.plan.manualAction.title}</p>
                      <p className="text-sm text-konami-text-dim leading-relaxed mt-1">
                        {pendingResolution.plan.manualAction.detail}
                      </p>
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => setPendingResolution(null)}
                          disabled={resolving}
                          className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
                          style={{ borderColor: '#D1D5DB', color: '#374151' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmResolution}
                          disabled={resolving}
                          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                          style={{ background: pendingResolution.resolution === 'refund' ? '#DC2626' : '#16A34A' }}
                        >
                          {resolving ? 'Resolving…' : 'Confirm resolution'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {selected.disputeStatus !== 'under_review' && (
                        <button
                          onClick={() => handleMarkUnderReview(selected)}
                          disabled={markingReview}
                          className="px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
                          style={{ borderColor: '#003BFF', color: '#003BFF' }}
                        >
                          {markingReview ? 'Marking…' : 'Mark under review'}
                        </button>
                      )}
                      <button
                        onClick={() => openResolution(selected, 'release')}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16} /> Release to Seller
                      </button>
                      <button
                        onClick={() => openResolution(selected, 'refund')}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={16} /> Refund Buyer
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="pt-2 border-t border-konami-mid-gray flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => navigate(`${ADMIN_ROUTE}/orders`)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors"
                  style={{ borderColor: '#D1D5DB', color: '#374151' }}
                >
                  <ExternalLink size={14} /> View order
                </button>
                <p className="text-[11px] text-konami-text-muted flex items-center gap-1.5">
                  <AlertTriangle size={12} /> {formatKesLabel(selected.amount)} held in escrow until you resolve.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return embedded ? content : <AdminLayout>{content}</AdminLayout>;
}
