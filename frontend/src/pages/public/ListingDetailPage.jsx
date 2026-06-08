import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getListingById, incrementViewCount } from '../../services/listingsService';
import { useAuth } from '../../context/AuthContext';
import { TIERS, PLATFORMS } from '../../utils/constants';
import { formatKES } from '../../utils/formatters';
import TierBadge from '../../components/listings/TierBadge';
import PlayerBadge from '../../components/listings/PlayerBadge';
import ReviewCard from '../../components/reviews/ReviewCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BuyNowModal from '../../components/checkout/BuyNowModal';
import { ChevronDown, ChevronUp, Shield, Star } from 'lucide-react';

const statRows = [
  { label: '5-Star Players', key: 'fiveStarCount' },
  { label: 'Gold Coins', key: 'goldCoins' },
  { label: 'GP', key: 'gp' },
  { label: 'Epic/Legendary Items', key: 'epicLegendaryCount' },
];

export default function ListingDetailPage() {
  const { id } = useParams();
  const { currentUser, userProfile } = useAuth();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getListingById(id),
      getDocs(query(collection(db, 'listings', id, 'reviews'), orderBy('createdAt', 'desc'))),
    ]).then(([listingData, reviewsSnap]) => {
      setListing(listingData);
      setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      if (listingData) {
        incrementViewCount(id);
        document.title = `${listingData.title} — eFootball Hub Kenya`;
      }
    });
    return () => { document.title = 'eFootball Hub Kenya — Buy & Sell eFootball Accounts with M-Pesa'; };
  }, [id]);

  if (loading) return <div className="pt-16"><LoadingSpinner fullScreen /></div>;
  if (!listing) {
    return (
      <div className="pt-16 min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <p className="text-[#9E9E9E]">Listing not found.</p>
      </div>
    );
  }

  const tierConfig = TIERS[listing.tier] || TIERS.bronze;
  const platformInfo = PLATFORMS[listing.platform] || { label: listing.platform };
  const isOwner = currentUser && listing.sellerId === currentUser.uid;
  const photos = listing.photos || [];
  const isSold = listing.status === 'sold';

  const howItWorksSteps = [
    'Find your desired account and click "Buy Now"',
    'Enter your M-Pesa phone number to receive STK Push',
    'Confirm the payment on your phone',
    'Chat with the seller to arrange account transfer',
    'Confirm receipt to release funds to the seller',
  ];

  return (
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      {isSold && (
        <div className="bg-[#BF0021]/10 border-b border-[#BF0021]/30 py-3">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <p className="text-sm text-[#BF0021] font-medium">
              This account has been sold. Browse other available accounts.
            </p>
            <Link to="/browse" className="btn-primary text-sm py-1.5 px-4">
              Browse Accounts
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 space-y-8">
            <div>
              <div className="relative rounded-xl overflow-hidden border border-[#2A2A2A] bg-[#1A1A1A] mb-3">
                {photos.length > 0 ? (
                  <img
                    src={photos[selectedPhoto]}
                    alt={listing.title}
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video flex flex-col items-center justify-center text-[#5C5C5C] bg-[#242424]">
                    <span className="text-5xl mb-2">⚽</span>
                    <span className="text-sm">No photos available</span>
                  </div>
                )}
              </div>

              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPhoto(i)}
                      className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === selectedPhoto ? 'border-[#BF0021]' : 'border-transparent'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-white mb-3">
                {listing.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <TierBadge tier={listing.tier} size="lg" />
                <span className="badge bg-[#242424] text-[#9E9E9E] border border-[#2A2A2A]">
                  {platformInfo.icon} {platformInfo.label}
                </span>
                <span className={`badge ${
                  listing.status === 'active' ? 'bg-green-400/10 text-green-400 border border-green-400/30' :
                  listing.status === 'sold' ? 'bg-[#BF0021]/10 text-[#BF0021] border border-[#BF0021]/30' :
                  'bg-[#242424] text-[#9E9E9E] border border-[#2A2A2A]'
                }`}>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm font-medium text-white">{listing.sellerDisplayName || 'Unknown Seller'}</span>
                {listing.sellerRating > 0 ? (
                  <span className="text-sm" style={{ color: '#D4AF37' }}>
                    <Star size={14} className="inline -mt-0.5" /> {listing.sellerRating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-xs text-[#5C5C5C]">New Seller</span>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-heading text-lg font-bold text-white mb-3">About This Account</h2>
              <p className="text-sm text-[#9E9E9E] leading-relaxed whitespace-pre-wrap">
                {listing.description || 'No description provided.'}
              </p>
            </div>

            {listing.featuredPlayers?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-heading text-lg font-bold text-white mb-3">Featured Players</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.featuredPlayers.map((player, i) => (
                    <PlayerBadge key={i} playerName={player} />
                  ))}
                </div>
              </div>
            )}

            <div className="card p-6">
              <h2 className="font-heading text-lg font-bold text-white mb-4">Account Stats</h2>
              <div className="space-y-3">
                {statRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0">
                    <span className="text-sm text-[#9E9E9E]">{row.label}</span>
                    <span className="text-sm font-semibold text-white">
                      {listing[row.key]?.toLocaleString() || '0'}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 border-b border-[#2A2A2A]">
                  <span className="text-sm text-[#9E9E9E]">Platform</span>
                  <span className="text-sm font-semibold text-white">{platformInfo.label}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#2A2A2A]">
                  <span className="text-sm text-[#9E9E9E]">Konami Link Type</span>
                  <span className="text-sm font-semibold text-white capitalize">{listing.konamiLinkType?.replace('_', ' ') || 'N/A'}</span>
                </div>
                {listing.guaranteeStatement && (
                  <div className="flex items-start justify-between py-2">
                    <span className="text-sm text-[#9E9E9E] shrink-0 mr-4">Guarantee</span>
                    <span className="text-sm text-white text-right">{listing.guaranteeStatement}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-heading text-lg font-bold text-white mb-4">
                Reviews ({reviews.length})
              </h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-[#5C5C5C]">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:w-[380px] shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              <div className="card p-6">
                <p className="text-sm text-[#9E9E9E] mb-1">Price</p>
                <p className="font-heading text-3xl font-bold text-white mb-4">
                  {formatKES(listing.price)}
                </p>

                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#2A2A2A]">
                  <div className="w-8 h-8 rounded-full bg-[#BF0021] flex items-center justify-center text-white text-xs font-bold">
                    {(listing.sellerDisplayName || 'S')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{listing.sellerDisplayName}</p>
                    <div className="flex items-center gap-1">
                      {listing.sellerRating > 0 ? (
                        <>
                          <Star size={12} color="#D4AF37" fill="#D4AF37" />
                          <span className="text-xs text-[#9E9E9E]">{listing.sellerRating.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-xs text-[#5C5C5C]">New seller</span>
                      )}
                      <span className="text-xs text-[#5C5C5C]">· {listing.sellerTotalSales || 0} sales</span>
                    </div>
                  </div>
                </div>

                {isSold ? (
                  <div className="space-y-3">
                    <div className="bg-[#BF0021]/10 border border-[#BF0021]/30 rounded-lg p-4 text-center">
                      <p className="text-sm font-semibold text-[#BF0021]">SOLD — This account is no longer available</p>
                    </div>
                    <Link to="/browse" className="btn-secondary w-full text-center text-sm block">
                      Browse Other Accounts
                    </Link>
                  </div>
                ) : isOwner ? (
                  <div>
                    <p className="text-sm text-[#9E9E9E] mb-3">This is your listing</p>
                    <Link to={`/transfer-room/edit/${listing.id}`} className="btn-secondary w-full text-center text-sm">
                      Edit Listing
                    </Link>
                  </div>
                ) : !currentUser ? (
                  <Link to="/login" className="btn-primary w-full text-lg py-4 mb-4 block text-center">
                    Login to Buy
                  </Link>
                ) : (
                  <button onClick={() => setShowBuyModal(true)} className="btn-primary w-full text-lg py-4 mb-4">
                    Buy Now — {formatKES(listing.price)}
                  </button>
                )}

                <div className="mt-4 p-3 bg-[#242424] rounded-lg flex items-start gap-2">
                  <Shield size={16} className="text-green-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-[#9E9E9E]">
                    Payment held in escrow until you confirm receipt
                  </p>
                </div>
              </div>

              <div className="card">
                <button
                  onClick={() => setShowSteps(!showSteps)}
                  className="w-full flex items-center justify-between p-4 text-sm font-medium text-white hover:bg-[#242424] transition-colors rounded-xl"
                >
                  How does this work?
                  {showSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showSteps && (
                  <div className="px-4 pb-4 space-y-2">
                    {howItWorksSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[#9E9E9E]">
                        <span className="w-5 h-5 rounded-full bg-[#BF0021] flex items-center justify-center text-xs text-white shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBuyModal && (
        <BuyNowModal listing={listing} onClose={() => setShowBuyModal(false)} />
      )}
    </div>
  );
}
