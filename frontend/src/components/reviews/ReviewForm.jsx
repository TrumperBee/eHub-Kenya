import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { submitSellerReview } from '../../services/reviewService';
import toast from 'react-hot-toast';

const ratingLabels = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];

export default function ReviewForm({ sellerId, sellerDisplayName, currentUser, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingReview, setExistingReview] = useState(null);

  useEffect(() => {
    if (!sellerId || !currentUser) return;
    
    const checkExistingReview = async () => {
      try {
        const reviewRef = doc(db, 'users', sellerId, 'reviews', currentUser.uid);
        const reviewSnap = await getDoc(reviewRef);
        if (reviewSnap.exists()) {
          const data = reviewSnap.data();
          setExistingReview(data);
          setRating(data.rating || 0);
          setComment(data.comment || '');
        }
      } catch (err) {
        console.warn('Error fetching existing review:', err);
      } finally {
        setFetching(false);
      }
    };

    checkExistingReview();
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

    setSubmitting(true);
    try {
      // Written by the backend so it can verify a completed order and update
      // the seller's aggregate rating (which clients may not do directly).
      await submitSellerReview({
        sellerId,
        rating,
        comment: comment.trim(),
      });

      toast.success(existingReview ? 'Review updated successfully' : 'Review posted successfully');
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to submit review. Try again.');
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
              {existingReview ? 'Update Your Review' : 'Rate Your Experience'} with {sellerDisplayName}
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X size={20} style={{ color: '#6B7280' }} />
            </button>
          </div>

          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#003BFF] border-t-transparent rounded-full animate-spin" />
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
                {submitting ? 'Posting...' : (existingReview ? 'Update Review' : 'Post Review')}
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