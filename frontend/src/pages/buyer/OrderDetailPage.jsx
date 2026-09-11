import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../hooks/useOrders';
import { ORDER_STATUS, BACKEND_URL } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';
import { canViewOrder } from '../../utils/orderAccess';
import { releaseEscrow, submitDelivery } from '../../services/paymentService';
import { subscribeToDeliveries } from '../../services/ordersService';
import { buyerCanConfirm, buyerCanDispute, sellerCanDeliver } from '../../utils/orderMachine';
import { buyerGuide, sellerGuide } from '../../utils/orderGuide';
import OrderStatePanel from '../../components/orders/OrderStatePanel';
import ContextHint from '../../components/common/ContextHint';
import ChatWindow from '../../components/chat/ChatWindow';
import ReviewForm from '../../components/reviews/ReviewForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Shield, MessageSquare, CheckCircle, Mail, KeyRound, Eye, EyeOff,
  Send, Upload, AlertTriangle, Lock, ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_STATUS = {
  paid:     { label: 'Paid',     color: 'text-green-600' },
  pending:  { label: 'Pending',  color: 'text-yellow-600' },
  abandoned:{ label: 'Abandoned', color: 'text-gray-500' },
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

function CredentialsList({ deliveries, isSeller }) {
  const [reveal, setReveal] = useState(false);
  const latest = deliveries && deliveries.length > 0 ? deliveries[0] : null;

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
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 bg-konami-light-gray border border-konami-mid-gray rounded-xl text-sm text-konami-text break-all font-mono">
            {reveal ? latest.accountPassword : '••••••••••••'}
          </div>
          <button
            onClick={() => setReveal((r) => !r)}
            className="btn-secondary px-3 py-2.5 text-sm shrink-0 flex items-center gap-1.5"
            aria-label={reveal ? 'Hide password' : 'Reveal password'}
          >
            {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
            {reveal ? 'Hide' : 'Reveal'}
          </button>
        </div>
      </div>

      {!isSeller && (
        <p className="text-xs text-konami-text-muted flex items-start gap-1.5">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          Change the password as soon as you log in. Login details are stored privately on this order — never in the public chat or reviews.
        </p>
      )}
    </div>
  );
}

function SellerDeliveryForm({ order }) {
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [confirmOk, setConfirmOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!accountEmail.trim()) {
      setError('Enter the eFootball account email.');
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
        accountPassword: accountPassword.trim(),
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
        <input
          type="password"
          value={accountPassword}
          onChange={(e) => { setAccountPassword(e.target.value); setError(''); }}
          placeholder="Account password"
          className="w-full px-3 py-2.5 bg-konami-light-gray border border-konami-mid-gray rounded-xl text-konami-text text-sm outline-none focus:border-konami-blue transition-colors"
        />
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
  const { currentUser, userProfile } = useAuth();
  const { order, loading, error } = useOrder(id);
  const [deliveries, setDeliveries] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeError, setDisputeError] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToDeliveries(id, setDeliveries, () => {});
    return unsub;
  }, [id]);

  if (loading) return <div className="pt-16"><LoadingSpinner fullScreen /></div>;
  if (error) return <DeniedScreen />;
  if (!order) return <NotFoundScreen />;
  if (!canViewOrder(order, currentUser)) return <DeniedScreen />;

  const paymentStatusConfig = PAYMENT_STATUS[order.paymentStatus];
  const statusConfig = ORDER_STATUS[order.status] || {};
  const currentStepIndex = stepIndexFor(order.status);
  const isBuyer = currentUser && order.buyerId === currentUser.uid;
  const isSeller = currentUser && order.sellerId === currentUser.uid;
  const canConfirmReceipt = isBuyer && buyerCanConfirm(order.status);
  const canDispute = isBuyer && buyerCanDispute(order.status) && !['open', 'under_review'].includes(order.disputeStatus);
  const canSubmitDelivery = isSeller && sellerCanDeliver(order.status);
  const canReview = isBuyer && order.status === 'completed';
  const isClosed = ['completed', 'disputed', 'refunded', 'cancelled'].includes(order.status);

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

  const handleSubmitReview = async ({ rating, comment }) => {
    if (!order.listingId) return;
    setReviewLoading(true);
    try {
      const reviewRef = doc(db, 'listings', order.listingId, 'reviews', id);
      await setDoc(reviewRef, {
        rating,
        comment,
        buyerId: currentUser.uid,
        buyerDisplayName: userProfile?.displayName || currentUser.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
      });

      const sellerRef = doc(db, 'users', order.sellerId);
      const sellerSnap = await getDoc(sellerRef);
      if (sellerSnap.exists()) {
        const sellerData = sellerSnap.data();
        const currentRating = sellerData.sellerRating || 0;
        const totalRatings = sellerData.sellerTotalRatings || 0;
        const newAvg = ((currentRating * totalRatings) + rating) / (totalRatings + 1);
        await updateDoc(sellerRef, {
          sellerRating: Math.round(newAvg * 10) / 10,
          sellerTotalRatings: totalRatings + 1,
        });
      }

      setShowReviewForm(false);
    } catch (err) {
      console.error('Review error:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {paymentSuccess && !isClosed && (
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
                  {STEPS.map((step) => {
                    const isComplete = currentStepIndex >= step.index;
                    const isCurrent = step.key === order.status;
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
                <OrderStatePanel guide={buyerGuide(order)}>
                  {order.status === 'credentials_submitted' && deliveries.length > 0 && (
                    <CredentialsList deliveries={deliveries} isSeller={false} />
                  )}

                  {order.status === 'disputed' && order.disputeReason && (
                    <div className="p-3 rounded-xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#B91C1C' }}>Your reason</p>
                      <p className="text-xs italic" style={{ color: '#374151' }}>"{order.disputeReason}"</p>
                    </div>
                  )}

                  {order.status === 'pending_payment' && order.listingId && (
                    <Link to={`/listing/${order.listingId}`} className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2">
                      <ShoppingBag size={16} /> View Listing to Pay
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
                      {(canConfirmReceipt || canDispute) && (
                        <div className="flex flex-col gap-2">
                          {canConfirmReceipt && (
                            <button onClick={() => setShowConfirm(true)} className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2">
                              <Shield size={16} />
                              Confirm Delivery
                            </button>
                          )}
                          {canDispute && (
                            <button onClick={() => setShowDisputeForm(true)} className="w-full text-sm py-3 rounded-xl border border-konami-red/30 text-konami-red hover:bg-konami-red/5 transition-colors flex items-center justify-center gap-2">
                              <MessageSquare size={16} />
                              Raise a Dispute
                            </button>
                          )}
                        </div>
                      )}

                      {canReview && !showReviewForm && (
                        <button onClick={() => setShowReviewForm(true)} className="btn-secondary w-full text-sm py-3">
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