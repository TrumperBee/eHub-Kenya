import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, setDoc, updateDoc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../hooks/useOrders';
import { ORDER_STATUS, BACKEND_URL } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';
import ChatWindow from '../../components/chat/ChatWindow';
import ReviewForm from '../../components/reviews/ReviewForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Shield, MessageSquare } from 'lucide-react';

const STEPS = [
  { key: 'payment_confirmed', label: 'Payment Confirmed', index: 0 },
  { key: 'in_transfer',       label: 'Transfer Started',  index: 1 },
  { key: 'completed',         label: 'Completed',         index: 2 },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const { currentUser, userProfile } = useAuth();
  const { order, loading } = useOrder(id);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  if (loading) return <div className="pt-16"><LoadingSpinner fullScreen /></div>;
  if (!order) {
    return (
      <div className="pt-16 min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <p className="text-[#9E9E9E]">Order not found.</p>
      </div>
    );
  }

  const statusConfig = ORDER_STATUS[order.status] || {};
  const currentStepIndex = STEPS.findIndex(s => s.key === order.status) ?? -1;
  const isBuyer = currentUser && order.buyerId === currentUser.uid;
  const canConfirmReceipt = isBuyer && (order.status === 'payment_confirmed' || order.status === 'in_transfer');
  const canDispute = isBuyer && order.status !== 'completed' && order.status !== 'disputed' && order.status !== 'cancelled';
  const canReview = isBuyer && order.status === 'completed';

  const handleConfirmReceipt = async () => {
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.post(`${BACKEND_URL}/api/escrow/release`, { orderId: id }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await addDoc(collection(db, 'notifications'), {
        userId: order.sellerId,
        title: 'Escrow Released',
        message: `${userProfile?.displayName || currentUser.displayName || 'Buyer'} confirmed receipt. Your payment is released.`,
        type: 'payment',
        orderId: id,
        read: false,
        createdAt: serverTimestamp(),
      });
      setShowConfirm(false);
    } catch (err) {
      console.error('Release error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) return;
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.post(`${BACKEND_URL}/api/escrow/dispute`, { orderId: id, reason: disputeReason.trim() }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowDisputeForm(false);
      setDisputeReason('');
    } catch (err) {
      console.error('Dispute error:', err);
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
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-[400px] shrink-0 space-y-4">
            <div className="card p-5 space-y-4">
              <div>
                <p className="text-xs text-[#5C5C5C] mb-1">Order ID</p>
                <p className="text-sm font-mono text-white break-all">{id}</p>
              </div>
              <div>
                <p className="text-xs text-[#5C5C5C] mb-1">Date</p>
                <p className="text-sm text-white">{formatDate(order.createdAt)}</p>
              </div>
              {order.listingId && (
                <div>
                  <p className="text-xs text-[#5C5C5C] mb-1">Listing</p>
                  <Link to={`/listing/${order.listingId}`} className="text-sm text-[#BF0021] hover:underline">
                    {order.listingTitle || 'View Listing'}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-xs text-[#5C5C5C] mb-1">Amount</p>
                <p className="font-heading text-xl font-bold text-white">{formatKES(order.amount)}</p>
              </div>
              {order.mpesaReceiptNumber && (
                <div>
                  <p className="text-xs text-[#5C5C5C] mb-1">M-Pesa Receipt</p>
                  <p className="text-sm text-white font-mono">{order.mpesaReceiptNumber}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#5C5C5C] mb-2">Status</p>
                <span className={`text-sm font-semibold ${statusConfig.color || 'text-[#9E9E9E]'}`}>
                  {statusConfig.label || order.status}
                </span>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-heading text-sm font-bold text-white mb-4">Order Progress</h3>
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[#2A2A2A]" />
                <div className="space-y-6">
                  {STEPS.map((step) => {
                    const isComplete = currentStepIndex >= step.index;
                    const isCurrent = order.status === step.key;
                    return (
                      <div key={step.key} className="flex items-center gap-3 relative">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          isComplete ? 'bg-green-500' : isCurrent ? 'bg-[#BF0021]' : 'bg-[#2A2A2A]'
                        }`}>
                          {isComplete ? (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-white' : 'bg-[#5C5C5C]'}`} />
                          )}
                        </div>
                        <span className={`text-sm ${isComplete ? 'text-white' : isCurrent ? 'text-[#BF0021] font-semibold' : 'text-[#5C5C5C]'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs text-[#5C5C5C] mb-2">Seller</p>
              <p className="text-sm font-medium text-white">{order.sellerDisplayName || 'Unknown'}</p>
              {order.sellerId && (
                <p className="text-xs text-[#5C5C5C] mt-1">ID: {order.sellerId.slice(0, 12)}...</p>
              )}
            </div>

            <div className="space-y-2">
              {canConfirmReceipt && (
                <>
                  {showConfirm ? (
                    <div className="card p-4 space-y-3">
                      <p className="text-sm text-[#9E9E9E]">Are you sure? This releases payment to the seller.</p>
                      <div className="flex gap-2">
                        <button onClick={handleConfirmReceipt} disabled={actionLoading} className="btn-primary flex-1 text-sm py-2.5">
                          {actionLoading ? 'Processing...' : 'Yes, Release Payment'}
                        </button>
                        <button onClick={() => setShowConfirm(false)} className="btn-secondary text-sm py-2.5">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowConfirm(true)} className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2">
                      <Shield size={16} />
                      Mark as Account Received
                    </button>
                  )}
                </>
              )}

              {canDispute && (
                <>
                  {showDisputeForm ? (
                    <div className="card p-4 space-y-3">
                      <textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Describe the issue..."
                        className="w-full px-3 py-2 bg-[#242424] border border-[#2A2A2A] rounded-xl text-white text-sm outline-none focus:border-[#BF0021] transition-colors resize-none min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleDispute} disabled={actionLoading || !disputeReason.trim()} className="btn-primary flex-1 text-sm py-2.5 bg-red-600 hover:bg-red-700">
                          {actionLoading ? 'Submitting...' : 'Submit Dispute'}
                        </button>
                        <button onClick={() => { setShowDisputeForm(false); setDisputeReason(''); }} className="btn-secondary text-sm py-2.5">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowDisputeForm(true)} className="w-full text-sm py-3 rounded-xl border border-red-400/30 text-red-400 hover:bg-red-400/5 transition-colors flex items-center justify-center gap-2">
                      <MessageSquare size={16} />
                      Raise a Dispute
                    </button>
                  )}
                </>
              )}

              {canReview && !showReviewForm && (
                <button onClick={() => setShowReviewForm(true)} className="btn-secondary w-full text-sm py-3">
                  Leave a Review
                </button>
              )}

              {showReviewForm && (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Leave a Review</h4>
                    <button onClick={() => setShowReviewForm(false)} className="text-xs text-[#5C5C5C] hover:text-white">Cancel</button>
                  </div>
                  <ReviewForm onSubmit={handleSubmitReview} loading={reviewLoading} />
                </div>
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
