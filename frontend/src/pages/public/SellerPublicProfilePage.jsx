import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import ListingCard from '../../components/listings/ListingCard';
import ReviewCard from '../../components/reviews/ReviewCard';
import ReviewForm from '../../components/reviews/ReviewForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Star, ShieldCheck, MessageCircle, X } from 'lucide-react';

export default function SellerPublicProfilePage() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [hasCompletedOrder, setHasCompletedOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [checkingOrder, setCheckingOrder] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    setCheckingOrder(true);

    const fetchSeller = getDoc(doc(db, 'users', sellerId));
    const fetchListings = getDocs(
      query(
        collection(db, 'listings'),
        where('sellerId', '==', sellerId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      )
    );

    Promise.all([fetchSeller, fetchListings]).then(([sellerSnap, listingsSnap]) => {
      if (sellerSnap.exists()) {
        setSeller({ id: sellerSnap.id, ...sellerSnap.data() });
      } else {
        setSeller(null);
      }
      setListings(listingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId || !currentUser) {
      setCheckingOrder(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', currentUser.uid),
      where('sellerId', '==', sellerId),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
    );

    getDocs(q).then(snap => {
      setHasCompletedOrder(snap.docs.length > 0);
      setCheckingOrder(false);
    });
  }, [sellerId, currentUser]);

  useEffect(() => {
    if (!sellerId) return;
    const reviewsRef = collection(db, 'users', sellerId, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [sellerId]);

  if (loading) return <div className="pt-[68px]"><LoadingSpinner fullScreen /></div>;
  if (!seller) {
    return (
      <div className="pt-[68px] min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <p className="text-[#6B7280]">Seller not found.</p>
      </div>
    );
  }

  const initials = (seller.sellerDisplayName || seller.displayName || 'S')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalRating = seller.sellerRating || 0;
  const totalReviews = seller.sellerTotalRatings || 0;
  const totalSales = seller.totalSales || 0;

  const canReview = currentUser && hasCompletedOrder;
  const showReviewButton = currentUser ? (hasCompletedOrder ? 'review' : 'no-order') : 'login';

  const handleReviewSuccess = () => {
    setShowReviewModal(false);
  };

  return (
    <div className="pt-[68px] min-h-screen bg-[#F5F5F5]">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="text-sm mb-4" style={{ color: '#6B7280' }}>
          <Link to="/" className="hover:underline" style={{ color: '#003BFF' }}>Home</Link>
          <span className="mx-2">&gt;</span>
          <span style={{ color: '#111111' }}>{seller.sellerDisplayName || seller.displayName || 'Seller'}</span>
        </div>

        <div className="rounded-2xl p-6 md:p-8" style={{ background: '#003BFF' }}>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-heading font-extrabold text-2xl shrink-0"
              style={{ background: '#001E7A' }}>
              {seller.photoURL ? (
                <img src={seller.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
              ) : initials}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-heading text-2xl md:text-[28px] font-extrabold text-white">
                  {seller.sellerDisplayName || seller.displayName || 'Unknown Seller'}
                </h1>
                {seller.sellerApproved && (
                  <span className="inline-flex items-center gap-1 text-xs font-heading font-bold text-white px-2.5 py-0.5 rounded-full"
                    style={{ background: '#10B981' }}>
                    <ShieldCheck size={12} />
                    Verified Seller
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star size={16} color="#FFF100" fill="#FFF100" />
                  <span className="font-heading font-bold text-white">
                    {totalRating > 0 ? totalRating.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-white/60 text-sm">
                    ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
                <span className="text-white/30">·</span>
                <span className="text-white/60 text-sm">
                  Member since {formatDate(seller.createdAt)}
                </span>
              </div>
              <p className="text-sm text-white/70">
                {totalSales} {totalSales === 1 ? 'account' : 'accounts'} sold
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-heading font-bold text-sm uppercase mb-3" style={{ color: '#003BFF' }}>
            About This Seller
          </h2>
          {seller.sellerBio ? (
            <p className="text-[15px] leading-relaxed" style={{ color: '#374151' }}>{seller.sellerBio}</p>
          ) : (
            <p className="text-sm italic" style={{ color: '#9CA3AF' }}>This seller hasn't added a bio yet.</p>
          )}
        </div>

        <div>
          <h2 className="font-heading text-2xl font-extrabold mb-5" style={{ color: '#111111' }}>
            Listings by {seller.sellerDisplayName || seller.displayName}
          </h2>
          {listings.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <p style={{ color: '#6B7280' }}>This seller has no active listings right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-heading text-2xl font-extrabold" style={{ color: '#111111' }}>
                What Buyers Say
              </h2>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                {reviews.length} verified {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            {showReviewButton === 'login' && (
              <button
                onClick={() => navigate('/login')}
                className="btn-blue text-sm"
              >
                Login to Write a Review
              </button>
            )}
            {showReviewButton === 'no-order' && (
              <div className="relative group">
                <button
                  disabled
                  className="btn-blue text-sm opacity-50 cursor-not-allowed"
                >
                  <MessageCircle size={14} />
                  Write a Review
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    You must purchase from this seller to leave a review
                  </div>
                </div>
              </div>
            )}
            {showReviewButton === 'review' && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="btn-blue text-sm"
              >
                <MessageCircle size={14} />
                Write a Review
              </button>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <p style={{ color: '#6B7280' }}>No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showReviewModal && (
        <ReviewForm
          sellerId={sellerId}
          sellerDisplayName={seller.sellerDisplayName || seller.displayName}
          currentUser={currentUser}
          userProfile={userProfile}
          onClose={() => setShowReviewModal(false)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
