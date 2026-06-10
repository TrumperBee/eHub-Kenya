import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, doc, getDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';

const ratingLabels = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];

export default function ReviewForm({ sellerId, sellerDisplayName, currentUser, userProfile, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!sellerId || !currentUser) return;
    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', currentUser.uid),
      where('sellerId', '==', sellerId),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
    );
    getDocs(q).then(snap => {
      if (snap.docs.length > 0) {
        setCompletedOrder({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
      setFetching(false);
    });
  }, [sellerId, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (comment.trim().length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }
    if (!completedOrder) {
      toast.error('No completed order found with this seller');
      return;
    }

    const orderId = completedOrder.id;
    const listingId = completedOrder.listingId;

    setSubmitting(true);
    try {
      const reviewRef = doc(db, 'listings', listingId, 'reviews', orderId);
      const existingSnap = await getDoc(reviewRef);
      if (existingSnap.exists()) {
        toast.error('You have already reviewed this seller for this order');
        setSubmitting(false);
        return;
      }

      const reviewData = {
        buyerId: currentUser.uid,
        buyerDisplayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        buyerUsername: userProfile?.username || currentUser.email?.split('@')[0] || 'anonymous',
        buyerPhotoURL: currentUser.photoURL || null,
        orderId,
        listingId,
        listingTitle: completedOrder.listingTitle || completedOrder.title || 'Account',
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(doc(db, 'listings', listingId, 'reviews', orderId), reviewData);
        transaction.set(doc(db, 'users', sellerId, 'reviews', orderId), reviewData);

        const sellerRef = doc(db, 'users', sellerId);
        const sellerSnap = await transaction.get(sellerRef);
        if (sellerSnap.exists()) {
          const sellerData = sellerSnap.data();
          const currentRating = sellerData.sellerRating || 0;
          const totalRatings = sellerData.sellerTotalRatings || 0;
          const newRating = ((currentRating * totalRatings) + rating) / (totalRatings + 1);
          transaction.update(sellerRef, {
            sellerRating: newRating,
            sellerTotalRatings: totalRatings + 1,
          });
        }
      });

      toast.success('Review posted successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const charCount = comment.length;
  const isValidLength = charCount >= 10 && charCount <= 500;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,20,80,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-1" style={{ background: '#FFF100' }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-extrabold text-lg" style={{ color: '#003BFF' }}>
              Rate Your Experience with {sellerDisplayName}
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X size={20} style={{ color: '#6B7280' }} />
            </button>
          </div>

          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#003BFF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !completedOrder ? (
            <div className="text-center py-6">
              <p style={{ color: '#6B7280' }}>You need to complete a purchase from this seller before reviewing.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>Your Rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        fill={(hover || rating) >= star ? '#FFF100' : 'none'}
                        color={(hover || rating) >= star ? '#FFF100' : '#D1D5DB'}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm mt-1 font-medium" style={{ color: ratingLabels[rating] ? '#003BFF' : '#9CA3AF' }}>
                  {ratingLabels[rating] || 'Select a rating'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                  Your Review
                </label>
                <textarea
                  placeholder="Share your experience. Did the seller deliver quickly? Was the account as described? Would you recommend them?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm resize-none outline-none transition-colors"
                  style={{
                    borderColor: comment.length > 0 && !isValidLength ? '#EF4444' : '#E0E0E0',
                    color: '#111111',
                    minHeight: 120,
                  }}
                  maxLength={500}
                  rows={4}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs" style={{ color: charCount > 500 ? '#EF4444' : '#9CA3AF' }}>
                    {charCount}/500
                  </span>
                </div>
                {comment.length > 0 && comment.length < 10 && (
                  <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>
                    Minimum 10 characters
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={rating === 0 || !isValidLength || submitting}
                className="w-full font-heading font-bold text-sm py-3 rounded-xl transition-all"
                style={{
                  background: '#FFF100',
                  color: '#003BFF',
                  opacity: (rating === 0 || !isValidLength || submitting) ? 0.5 : 1,
                }}
              >
                {submitting ? 'Posting...' : 'Post Review'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm hover:underline"
                  style={{ color: '#6B7280' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
