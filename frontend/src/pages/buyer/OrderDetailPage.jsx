import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../hooks/useOrders';
import { ORDER_STATUS, BACKEND_URL } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';
import { canViewOrder } from '../../utils/orderAccess';
import { releaseEscrow, submitDelivery, verifyOrderPayment, revealOrderCredentials } from '../../services/paymentService';
import { subscribeToDeliveries } from '../../services/ordersService';
import { submitSellerReview } from '../../services/reviewService';
import { buyerCanConfirm, buyerCanDispute, sellerCanDeliver, isPaidStatus } from '../../utils/orderMachine';
import { buyerGuide, sellerGuide } from '../../utils/orderGuide';
import OrderStatePanel from '../../components/orders/OrderStatePanel';
import ContextHint from '../../components/common/ContextHint';
import ChatWindow from '../../components/chat/ChatWindow';
import ReviewForm from '../../components/reviews/ReviewForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Shield, MessageSquare, CheckCircle, Mail, KeyRound, Eye, EyeOff, Copy,
  Send, Upload, AlertTriangle, Lock, ShoppingBag, Loader, RefreshCw, Star,
} from 'lucide-react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const PAYMENT_STATUS = {
  paid:     { label: 'Paid',     color: 'text-green-600' },
  pending:  { label: 'Pending',  color: 'text-yellow-600' },
  abandoned:{ label: 'Abandoned', color: 'text-gray-500' },
  confirming: { label: 'Confirming…', color: 'text-blue-600' },
};

function DeniedScreen() {
  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center px-4">
      <div className="card p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-konami-red" />
        </div>
        <h1 className="font-heading text-xl font-bold text-konami-text mb-2">Not Authorized</h1>
        <p className="text-sm text-konami-text-muted mb-6">
          You are not authorized to view this order. Orders can only be accessed by the buyer, the seller, or eHub support.
        </p>
        <Link to="/orders" className="btn-primary inline-flex items-center gap-2 text-sm">
          Go to My Orders
        </Link>
      </div>
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center px-4">
      <div className="card p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-konami-light-gray flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={24} className="text-konami-text-muted" />
        </div>
        <h1 className="font-heading text-xl font-bold text-konami-text mb-2">Order Not Found</h1>
        <p className="text-sm text-konami-text-muted mb-6">
          We could not find this order. It may have been removed, or the link may be incorrect.
        </p>
        <div className="flex flex-col gap-2">
          <Link to="/orders" className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
            My Orders
          </Link>
          <Link to="/browse" className="btn-secondary text-sm">
            Browse Listings
          </Link>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { key: 'awaiting_seller_delivery', label: 'Awaiting Seller Delivery', index: 0 },
  { key: 'credentials_submitted',    label: 'Account Details Submitted', index: 1 },
  { key: 'completed',                label: 'Completed',                 index: 2 },
];

// Legacy statuses map onto the same machine positions so old orders stay valid.
function stepIndexFor(status) {
  if (status === 'payment_confirmed' || status === 'awaiting_seller_delivery') return 0;
  if (status === 'in_transfer' || status === 'credentials_submitted') return 1;
  if (status === 'completed') return 2;
  return -1;
}

// --- 30-minute buyer verification window -----------------------------------
// The authoritative deadline is written server-side on the first credential
// reveal (`reveal + 30:00`, never restarted). Before that reveal, the expected
// window is shown from the moment payment was confirmed (`paidAt + 30:00`).
const VERIFICATION_WINDOW_MS = 30 * 60 * 1000;

const toMillis = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

function VerificationCountdown({ order }) {
  // eslint-disable-next-line react-hooks/purity -- initial clock value; refined on mount
  const [nowMs, setNowMs] = useState(Date.now());

  // Isolated 1-second tick so only this box re-renders, never the page/chat.
  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const paidAtMs = toMillis(order?.paidAt) ?? toMillis(order?.createdAt);
  const deadlineMs =
    toMillis(order?.verificationDeadline) ??
    (paidAtMs != null ? paidAtMs + VERIFICATION_WINDOW_MS : null);
  if (deadlineMs == null) return null;

  const remainingMs = Math.max(0, deadlineMs - nowMs);
  const expired = remainingMs === 0;
  const urgent = !expired && remainingMs <= 5 * 60 * 1000;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const countdown = `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(
    totalSeconds % 60
  ).padStart(2, '0')}`;
  const released =
    order?.status === 'completed' ||
    String(order?.escrowStatus || '').toLowerCase() === 'released';

  return (
    <div
      className={`rounded-xl p-4 border ${
        expired ? 'border-[#C8102E]/40 bg-[#C8102E]/5' : 'border-[#FFF100]/40 bg-[#FFF100]/5'
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={16}
          className={`shrink-0 mt-0.5 ${expired ? 'text-konami-red' : 'text-[#8A7D00]'}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-konami-text">
            ⚠ You have 30 minutes to verify this account. If you do not confirm or raise a dispute,
            payment will be automatically released to the seller.
          </p>
          {expired ? (
            <p className="mt-2 font-heading text-lg font-extrabold uppercase tracking-wide text-konami-red">
              Time expired — {released ? 'payment released' : 'payment will be released to the seller'}
            </p>
          ) : (
            <p className="mt-2 flex items-baseline gap-2">
              <span
                className={`font-heading text-2xl font-extrabold tabular-nums tracking-wide ${
                  urgent ? 'text-konami-red' : 'text-konami-text'
                }`}
              >
                {countdown}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">
                remaining to confirm
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CredentialsList({ deliveries, isSeller, orderId, revealed = null, onReveal }) {
  const [reveal, setReveal] = useState(Boolean(revealed));
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [revealError, setRevealError] = useState('');

  const [revealPending, setRevealPending] = useState(false);

  const latest = deliveries && deliveries.length > 0 ? deliveries[0] : null;

  const copyValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Could not copy the ${label.toLowerCase()} automatically — long-press or tap it to select and copy manually.`);
    }
  };

  const handleReveal = async () => {
    setRevealPending(true);
    setRevealError('');
    try {
      // The server records the 30-minute window on the order document, which
      // streams back here in real time — nothing to keep in local state.
      await onReveal(orderId);
      setReveal(true);
    } catch (err) {
      setRevealError(
        err?.response?.data?.error ||
          err?.message ||
          'Could not reveal account details right now. Please try again.'
      );
      setConfirmReveal(false);
    } finally {
      setRevealPending(false);
    }
  };

  if (!latest) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-konami-text-muted mb-1 flex items-center gap-1.5">
          <Mail size={13} /> Account Email
        </p>
        <div className="px-3 py-2.5 bg-konami-light-gray border border-konami-mid-gray rounded-xl text-sm text-konami-text break-all">
          {latest.accountEmail}
        </div>
      </div>

      <div>
        <p className="text-xs text-konami-text-muted mb-1 flex items-center gap-1.5">
          <KeyRound size={13} /> Account Password
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-0 px-3 py-2.5 bg-konami-light-gray border border-konami-mid-gray rounded-xl text-sm text-konami-text break-all font-mono">
            {reveal ? latest.accountPassword : '••••••••••••'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {reveal && (
              <button
                onClick={() => copyValue(latest.accountPassword, 'Password')}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-konami-blue bg-white px-3 py-1.5 text-xs font-medium text-konami-blue transition-colors hover:bg-konami-blue hover:text-white"
                aria-label="Copy account password"
              >
                <Copy size={14} /> Copy
              </button>
            )}
            <button
              onClick={() => {
                if (reveal) {
                  setReveal(false);
                } else {
                  setConfirmReveal(true);
                }
              }}
              disabled={revealPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-konami-blue bg-white px-3 py-1.5 text-xs font-medium text-konami-blue transition-colors hover:bg-konami-blue hover:text-white disabled:opacity-60"
              aria-label={reveal ? 'Hide password' : 'Show password'}
            >
              {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
              {revealPending ? 'Loading…' : reveal ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {!isSeller && (
        <p className="text-xs text-konami-text-muted mb-1 flex items-start gap-1.5">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          Change the password as soon as you log in. Login details are stored privately on this order — never in the public chat or reviews.
        </p>
      )}

      {revealError && (
        <p className="text-xs text-konami-red">{revealError}</p>
      )}

      <ConfirmDialog
        open={confirmReveal}
        title="Before revealing your password"
        message="Once you access this account, change the account email and password to secure it under your control. After revealing, the password is only visible to you here. Keep this order page open and never share the password in the public chat."
        confirmLabel="Continue & Show Password"
        onConfirm={() => {
          setConfirmReveal(false);
          // Starts the server-side 30-minute verification window (first reveal
          // wins) so the buyer countdown and auto-release use the same deadline.
          handleReveal();
        }}
        onCancel={() => setConfirmReveal(false)}
        variant="default"
      />
    </div>
  );
}

function SellerDeliveryForm({ order }) {
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [confirmOk, setConfirmOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async () => {
    if (!accountEmail.trim()) {
      setError('Enter the eFootball account email.');
      return;
    }
    if (!EMAIL_RE.test(accountEmail.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!accountPassword.trim()) {
      setError('Enter the eFootball account password.');
      return;
    }
    if (!confirmOk) {
      setError('Confirm that these are the correct account login details.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await submitDelivery(order.id, {
        accountEmail: accountEmail.trim(),
        accountPassword: accountPassword,
      });
      toast.success('Account details submitted to the buyer.');
      setAccountEmail('');
      setAccountPassword('');
      setConfirmOk(false);
    } catch (err) {
      console.error('Delivery submit error:', err);
      setError(err?.response?.data?.error || 'Failed to submit account details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-konami-text-muted mb-1 flex items-center gap-1.5">
          <Mail size={13} /> eFootball Account Email
        </p>
        <input
          type="email"
          value={accountEmail}
          onChange={(e) => { setAccountEmail(e.target.value); setError(''); }}
          placeholder="Buyer's eFootball account email"
          className="w-full px-3 py-2.5 bg-konami-light-gray border border-konami-mid-gray rounded-xl text-konami-text text-sm outline-none focus:border-konami-blue transition-colors"
        />
      </div>

      <div>
        <p className="text-xs text-konami-text-muted mb-1 flex items-center gap-1.5">
          <KeyRound size={13} /> eFootball Account Password
        </p>
        <div className="relative">
          <input
            type={reveal ? 'text' : 'password'}
            value={accountPassword}
            onChange={(e) => { setAccountPassword(e.target.value); setError(''); }}
            placeholder="Account password"
            autoComplete="new-password"
            className="w-full px-3 py-2.5 pr-10 bg-konami-light-gray border border-konami-mid-gray rounded-xl text-konami-text text-sm outline-none focus:border-konami-blue transition-colors"
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-konami-text-muted hover:text-konami-text transition-colors"
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-konami-text-dim cursor-pointer">
        <input
          type="checkbox"
          checked={confirmOk}
          onChange={(e) => { setConfirmOk(e.target.checked); setError(''); }}
          className="mt-0.5"
        />
        I confirm that these are the correct login details for the eFootball account the buyer purchased.
      </label>

      {error && <p className="text-xs" style={{ color: '#C8102E' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2"
      >
        {loading ? <><Send size={16} className="animate-pulse" /> Submitting...</> : <><Upload size={16} /> Submit Account Details</>}
      </button>

      <p className="text-xs text-konami-text-muted flex items-start gap-1.5">
        <Shield size={13} className="shrink-0 mt-0.5" />
        Credentials are delivered privately inside this order — never shared in public chat, URLs, or browser storage.
      </p>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';
  const { currentUser } = useAuth();
  const { order, loading, error } = useOrder(id);
  const [deliveries, setDeliveries] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeError, setDisputeError] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const autoVerifiedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToDeliveries(id, setDeliveries, () => {});
    return unsub;
  }, [id]);

  // Self-heal: ZetuPay confirms M-Pesa payments via webhook, and the order
  // snapshot updates in real time once it fires. If the webhook is late, poll
  // the order-status endpoint for a short while so the buyer sees the payment
  // confirmed instead of staring at pending_payment.
  useEffect(() => {
    if (!paymentSuccess || autoVerifiedRef.current) return;
    if (!order || order.status !== 'pending_payment') return;
    if (order.paymentStatus === 'paid' || isPaidStatus(order.status)) return;
    autoVerifiedRef.current = true;
    let cancelled = false;
    let retryTimer = null;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const data = await verifyOrderPayment(id);
        if (cancelled) return;
        if (data?.status && data.status !== 'pending_payment') {
          toast.success('Payment confirmed. The seller has been notified.');
          return;
        }
      } catch (err) {
        console.error('Auto payment verification failed:', err);
      }
      if (!cancelled && attempts < 10) {
        retryTimer = setTimeout(poll, 3000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [paymentSuccess, order, id]);

  if (loading) return <div className="pt-16"><LoadingSpinner fullScreen /></div>;
  if (error) return <DeniedScreen />;
  if (!order) return <NotFoundScreen />;
  if (!canViewOrder(order, currentUser)) return <DeniedScreen />;

  // Firestore order state is the single source of truth for what this page shows.
  // The ?payment=success URL param is only a redirect signal from the payment flow:
  // while the backend has not yet confirmed the charge, we show a transient
  // "Confirming your payment" state instead of claiming payment is confirmed.
  const isPaid = order.paymentStatus === 'paid' || isPaidStatus(order.status);
  const isClosed = ['completed', 'disputed', 'refunded', 'cancelled'].includes(order.status);
  const isConfirming = paymentSuccess && !isPaid && order.status === 'pending_payment';
  const paymentStatusConfig = isConfirming ? PAYMENT_STATUS.confirming : PAYMENT_STATUS[order.paymentStatus];
  const statusConfig = ORDER_STATUS[order.status] || {};
  const currentStepIndex = stepIndexFor(order.status);
  const isBuyer = currentUser && order.buyerId === currentUser.uid;
  const isSeller = currentUser && order.sellerId === currentUser.uid;
  const canConfirmReceipt = isBuyer && buyerCanConfirm(order.status);
  const canDispute = isBuyer && buyerCanDispute(order.status) && !['open', 'under_review'].includes(order.disputeStatus);
  const canSubmitDelivery = isSeller && sellerCanDeliver(order.status);
  const canReview = isBuyer && order.status === 'completed';

  const progressSteps = [
    { key: 'payment', label: isPaid ? 'Payment Confirmed' : 'Payment Pending', index: 0 },
    ...STEPS.map((step) => ({ ...step, index: step.index + 1 })),
  ];

  const handleConfirmReceipt = async () => {
    setActionLoading(true);
    try {
      await releaseEscrow(id);
      setShowConfirm(false);
      toast.success('Transaction complete. Thank you!');
    } catch (err) {
      console.error('Release error:', err);
      toast.error(err?.response?.data?.error || 'Failed to release escrow');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async () => {
    if (order.status === 'disputed') {
      toast.error('A dispute is already open for this order.');
      return;
    }
    if (disputeReason.trim().length < 20) {
      setDisputeError('Please describe the issue in at least 20 characters.');
      return;
    }
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.post(`${BACKEND_URL}/api/escrow/dispute`, { orderId: id, reason: disputeReason.trim() }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowDisputeForm(false);
      setDisputeReason('');
      setDisputeError('');
      toast.success('Dispute raised. Admin has been notified.');
    } catch (err) {
      console.error('Dispute error:', err);
      toast.error('Failed to raise dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    setVerifyingPayment(true);
    try {
      await verifyOrderPayment(id);
      toast.success('Payment status checked. This page updates automatically.');
    } catch (err) {
      console.error('Payment verify error:', err);
      toast.error(err?.response?.data?.error || 'Could not verify the payment right now. Try again in a moment.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleSubmitReview = async ({ rating, comment }) => {
    setReviewLoading(true);
    try {
      await submitSellerReview({ orderId: id, rating, comment });
      toast.success('Review posted successfully');
      setShowReviewForm(false);
    } catch (err) {
      console.error('Review error:', err);
      toast.error(err?.response?.data?.error || 'Could not post your review. Please try again.');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isConfirming && (
          <div className="bg-blue-600 text-white rounded-xl p-4 mb-6 flex items-center gap-3">
            <Loader size={20} className="shrink-0 animate-spin" />
            <div className="flex-1">
              <p className="font-heading font-bold text-sm uppercase">Confirming your payment</p>
              <p className="text-white/80 text-xs">
                Your M-Pesa payment was approved. We're confirming it now — this page updates automatically once confirmed.
              </p>
            </div>
            <button
              onClick={handleVerifyPayment}
              disabled={verifyingPayment}
              className="shrink-0 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 transition-colors disabled:opacity-60"
            >
              {verifyingPayment ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {verifyingPayment ? 'Checking…' : 'Check Now'}
            </button>
          </div>
        )}

        {paymentSuccess && isPaid && !isClosed && !isConfirming && (
          <div className="bg-green-500 text-white rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle size={20} className="shrink-0" />
            <div>
              <p className="font-heading font-bold text-sm uppercase">You're almost done.</p>
              <p className="text-white/80 text-xs">
                Your payment is confirmed. The seller has been notified and will submit the account details here.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-[400px] shrink-0 space-y-4">
            <div className="card p-5 space-y-4">
              <div>
                <p className="text-xs text-konami-text-muted mb-1">Order ID</p>
                <p className="text-sm font-mono text-konami-text break-all">{id}</p>
              </div>
              <div>
                <p className="text-xs text-konami-text-muted mb-1">Date</p>
                <p className="text-sm text-konami-text">{formatDate(order.createdAt)}</p>
              </div>
              {order.listingId && (
                <div>
                  <p className="text-xs text-konami-text-muted mb-1">Listing</p>
                  <Link to={`/listing/${order.listingId}`} className="text-sm text-konami-blue hover:underline">
                    {order.listingTitle || 'View Listing'}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-xs text-konami-text-muted mb-1">Amount</p>
                <p className="font-heading text-xl font-bold text-konami-text">{formatKES(order.amount)}</p>
              </div>
              {order.paymentReference && (
                <div>
                  <p className="text-xs text-konami-text-muted mb-1">Payment Reference</p>
                  <p className="text-sm text-konami-text font-mono">{order.paymentReference}</p>
                </div>
              )}
              {order.paymentChannel && (
                <div>
                  <p className="text-xs text-konami-text-muted mb-1">Payment Channel</p>
                  <p className="text-sm text-konami-text capitalize">{order.paymentChannel.replace('_', ' ')}</p>
                </div>
              )}
              {paymentStatusConfig && (
                <div>
                  <p className="text-xs text-konami-text-muted mb-1">Payment Status</p>
                  <p className={`text-sm font-semibold ${paymentStatusConfig.color}`}>{paymentStatusConfig.label}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-konami-text-muted mb-2">Status</p>
                <span className={`text-sm font-semibold ${statusConfig.color || 'text-konami-text-dim'}`}>
                  {statusConfig.label || order.status}
                </span>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-heading text-sm font-bold text-konami-text mb-4">Order Progress</h3>
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-konami-mid-gray" />
                <div className="space-y-6">
                  {progressSteps.map((step) => {
                    const isComplete = step.key === 'payment'
                      ? isPaid
                      : isPaid && (currentStepIndex + 1) >= step.index;
                    const isCurrent = step.key === 'payment'
                      ? order.status === 'pending_payment' && !isPaid
                      : step.key === order.status;
                    return (
                      <div key={step.key} className="flex items-center gap-3 relative">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          isComplete ? 'bg-green-500' : isCurrent ? 'bg-konami-blue' : 'bg-konami-mid-gray'
                        }`}>
                          {isComplete ? (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-white' : 'bg-konami-text-dim'}`} />
                          )}
                        </div>
                        <span className={`text-sm ${isComplete ? 'text-konami-text font-semibold' : isCurrent ? 'text-konami-blue font-semibold' : 'text-konami-text-muted'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs text-konami-text-muted mb-2">Seller</p>
              <p className="text-sm font-medium text-konami-text">{order.sellerDisplayName || 'Unknown'}</p>
              {order.sellerId && (
                <p className="text-xs text-konami-text-muted mt-1">ID: {order.sellerId.slice(0, 12)}...</p>
              )}
            </div>

            <div className="space-y-3">
              {isBuyer ? (
                <OrderStatePanel guide={isConfirming ? {
                  tone: 'waiting',
                  title: 'CONFIRMING PAYMENT',
                  whatHappened: 'M-Pesa accepted your payment. We are confirming it now — this can take a few seconds.',
                  next: 'This page updates automatically once confirmed. No need to pay again.',
                  whoActs: 'eHub × ZetuPay',
                  ctaLabel: 'Check payment status',
                } : buyerGuide(order)}>
                  {order.status === 'credentials_submitted' && deliveries.length > 0 && (
                    <details open className="group">
                      <summary className="text-sm font-bold text-konami-blue cursor-pointer flex items-center gap-1.5 select-none">
                        <KeyRound size={15} className="shrink-0" /> View Account Details
                      </summary>
                      <div className="mt-3">
                        <CredentialsList deliveries={deliveries} isSeller={false} orderId={order.id} onReveal={revealOrderCredentials} />
                      </div>
                    </details>
                  )}

                  {order.status === 'disputed' && order.disputeReason && (
                    <div className="p-3 rounded-xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#B91C1C' }}>Your reason</p>
                      <p className="text-xs italic" style={{ color: '#374151' }}>"{order.disputeReason}"</p>
                    </div>
                  )}

                  {order.status === 'pending_payment' && !isConfirming && order.listingId && (
                    <Link to={`/listing/${order.listingId}`} className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2">
                      <ShoppingBag size={16} /> Continue to Pay
                    </Link>
                  )}

                  {showConfirm ? (
                    <div className="bg-white rounded-xl p-4 space-y-3 border border-konami-mid-gray">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-konami-red shrink-0 mt-0.5" />
                        <p className="text-sm text-konami-text-dim">
                          Are you sure? This releases the payment to the seller and cannot be undone. Make sure you can log in to the account before confirming.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleConfirmReceipt} disabled={actionLoading} className="btn-primary flex-1 text-sm py-2.5">
                          {actionLoading ? 'Processing...' : 'Yes, Confirm Delivery'}
                        </button>
                        <button onClick={() => setShowConfirm(false)} className="btn-secondary text-sm py-2.5">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : showDisputeForm ? (
                    <div className="bg-white rounded-xl p-4 space-y-3 border border-konami-mid-gray">
                      <ContextHint tone="red" title="What to tell eHub">
                        Describe the problem: what you expected, what happened instead, and any screenshot details. Clear context speeds up the review.
                      </ContextHint>
                      <textarea
                        value={disputeReason}
                        onChange={(e) => { setDisputeReason(e.target.value); setDisputeError(''); }}
                        placeholder="Describe the issue (min 20 characters)..."
                        className="w-full px-3 py-2 bg-konami-light-gray border border-konami-mid-gray rounded-xl text-konami-text text-sm outline-none focus:border-konami-blue transition-colors resize-none min-h-[80px]"
                      />
                      {disputeError && <p className="text-xs" style={{ color: '#C8102E' }}>{disputeError}</p>}
                      <div className="flex gap-2">
                        <button onClick={handleDispute} disabled={actionLoading} className="btn-primary flex-1 text-sm py-2.5 bg-konami-red hover:bg-konami-red-hover">
                          {actionLoading ? 'Submitting...' : 'Submit Dispute'}
                        </button>
                        <button onClick={() => { setShowDisputeForm(false); setDisputeReason(''); setDisputeError(''); }} className="btn-secondary text-sm py-2.5">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isBuyer && canConfirmReceipt && <VerificationCountdown order={order} />}

                      {(canConfirmReceipt || canDispute) && (
                        <div className="flex flex-col gap-2">
                          {canConfirmReceipt && (
                            <button onClick={() => setShowConfirm(true)} className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2">
                              <Shield size={16} />
                              Confirm Delivery
                            </button>
                          )}
                          {canDispute && (
                            <>
                              {order.status === 'awaiting_seller_delivery' && (
                                <p className="text-xs text-konami-text-muted pt-1">Need help? You can raise a dispute while you wait.</p>
                              )}
                              <button onClick={() => setShowDisputeForm(true)} className="w-full text-sm py-3 rounded-xl border border-konami-red/30 text-konami-red hover:bg-konami-red/5 transition-colors flex items-center justify-center gap-2">
                                <MessageSquare size={16} />
                                {order.status === 'credentials_submitted' || order.status === 'in_transfer' ? 'Report a Problem' : 'Raise a Dispute'}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {canReview && !showReviewForm && (
                        <button
                          onClick={() => setShowReviewForm(true)}
                          className="w-full inline-flex items-center justify-center gap-2 bg-[#FFF100] text-gray-900 font-heading font-bold uppercase tracking-wide rounded-xl px-6 py-3 hover:bg-yellow-300 transition-colors"
                        >
                          <Star size={18} className="fill-gray-900" />
                          Leave a Review
                        </button>
                      )}

                      {showReviewForm && (
                        <div className="bg-white rounded-xl p-4 space-y-3 border border-konami-mid-gray">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-konami-text">Leave a Review</h4>
                            <button onClick={() => setShowReviewForm(false)} className="text-xs text-konami-text-muted hover:text-konami-text">Cancel</button>
                          </div>
                          <ReviewForm onSubmit={handleSubmitReview} loading={reviewLoading} />
                        </div>
                      )}
                    </>
                  )}

                  {order.disputeResolution && (order.status === 'completed' || order.status === 'refunded') && (
                    <div className="bg-white rounded-xl p-4 space-y-2 border" style={{ borderColor: order.status === 'refunded' ? '#C8102E' : '#16A34A' }}>
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className={`${order.status === 'refunded' ? 'text-konami-red' : 'text-green-600'} shrink-0`} />
                        <p className={`text-sm font-bold uppercase ${order.status === 'refunded' ? '' : 'text-green-600'}`} style={order.status === 'refunded' ? { color: '#C8102E' } : {}}>
                          Dispute Resolved — {order.status === 'refunded' ? 'Refunded to You' : 'Released to Seller'}
                        </p>
                      </div>
                      <p className="text-xs text-konami-text-dim">
                        {order.status === 'refunded'
                          ? `The dispute was resolved in your favour. ${order.disputeResolvedAt || order.resolvedAt ? 'Resolved on ' + formatDate(order.disputeResolvedAt || order.resolvedAt) + '. ' : ''}Your refund is being processed back to your payment method.`
                          : `The dispute was resolved in the seller's favour${order.disputeResolvedAt || order.resolvedAt ? ' on ' + formatDate(order.disputeResolvedAt || order.resolvedAt) : ''}. The order is complete.`}
                      </p>
                      <p className="text-xs text-konami-text-dim">
                        Check your notifications and the chat below for the resolution details.
                      </p>
                    </div>
                  )}
                </OrderStatePanel>
              ) : (
                <OrderStatePanel guide={sellerGuide(order)}>
                  {canSubmitDelivery && order.status === 'awaiting_seller_delivery' && <SellerDeliveryForm order={order} />}

                  {canSubmitDelivery && order.status === 'credentials_submitted' && (
                    <details className="group">
                      <summary className="text-xs font-semibold text-konami-blue cursor-pointer">
                        <CheckCircle size={13} className="inline mr-1 text-green-500" />
                        Submitted — view or resubmit account details
                      </summary>
                      <div className="mt-3">
                        <SellerDeliveryForm order={order} />
                      </div>
                    </details>
                  )}

                  {order.status === 'disputed' && (
                    <>
                      {order.disputeReason && (
                        <div className="p-3 rounded-xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: '#B91C1C' }}>Reason</p>
                          <p className="text-xs italic" style={{ color: '#374151' }}>"{order.disputeReason}"</p>
                        </div>
                      )}
                      <ContextHint tone="amber">
                        Keep communicating in the chat below — it is used as evidence during review.
                      </ContextHint>
                    </>
                  )}

                  {canSubmitDelivery && order.status === 'awaiting_seller_delivery' && (
                    <ContextHint tone="red">
                      Only share login details inside this order. Never post them in public chats or messages.
                    </ContextHint>
                  )}

                  {order.status === 'completed' && (
                    <ContextHint>
                      No further action from you — the admin sends your payout to your registered payout phone number.
                    </ContextHint>
                  )}
                </OrderStatePanel>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <ChatWindow orderId={id} order={order} currentUserId={currentUser?.uid} />
          </div>
        </div>
      </div>
    </div>
  );
}