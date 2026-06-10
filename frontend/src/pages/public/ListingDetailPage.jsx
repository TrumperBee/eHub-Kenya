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
import { ChevronDown, ChevronUp, Shield, Star, Circle } from 'lucide-react';

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

  if (loading) return <div className="pt-[68px]"><LoadingSpinner fullScreen /></div>;
  if (!listing) {
    return (
      <div className="pt-[68px] min-h-screen bg-konami-light-gray flex items-center justify-center">
        <p className="text-konami-text-muted">Listing not found.</p>
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
    <div className="pt-[68px] min-h-screen" style={{ background: '#F5F5F5' }}>
      {isSold && (
        <div className="py-3" style={{ background: '#C8102E' }}>
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <p className="text-sm text-white font-heading font-bold uppercase tracking-wider">
              THIS ACCOUNT HAS BEEN SOLD
            </p>
            <Link to="/browse" className="btn-primary text-sm !py-1.5 !px-4">
              Browse Accounts
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-sm mb-6" style={{ color: '#6B7280' }}>
          <Link to="/" className="hover:underline" style={{ color: '#003BFF' }}>Home</Link>
          <span className="mx-2">&gt;</span>
          <Link to="/browse" className="hover:underline" style={{ color: '#003BFF' }}>Browse</Link>
          <span className="mx-2">&gt;</span>
          <span style={{ color: '#111111' }}>{listing.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 space-y-6">
            <div className="card overflow-hidden">
              <div className="relative bg-konami-blue-deep">
                {photos.length > 0 ? (
                  <img
                    src={photos[selectedPhoto]}
                    alt={listing.title}
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center">
                    <span className="text-5xl opacity-60"><Circle size={48} /></span>
                  </div>
                )}
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPhoto(i)}
                      className="shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all duration-200"
                      style={{
                        border: i === selectedPhoto ? '2px solid #003BFF' : '2px solid transparent',
                      }}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-6">
              <h1 className="font-heading text-2xl md:text-3xl font-extrabold uppercase mb-3" style={{ color: '#111111' }}>
                {listing.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <TierBadge tier={listing.tier} size="lg" />
                <span className="bg-konami-blue text-white rounded-full px-3 py-1 text-xs font-heading font-bold uppercase tracking-wide">
                  {platformInfo.icon} {platformInfo.label}
                </span>
                <span className="badge-white rounded-full px-3 py-1 text-xs font-heading font-bold uppercase" style={{ border: '1px solid #003BFF' }}>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-heading font-bold" style={{ background: '#003BFF' }}>
                  {(listing.sellerDisplayName || 'S')[0]}
                </div>
                <Link to={`/seller/${listing.sellerId}`} className="font-heading text-sm font-bold hover:underline" style={{ color: '#003BFF' }}>{listing.sellerDisplayName || 'Unknown Seller'}</Link>
                {listing.sellerRating > 0 ? (
                  <span className="text-sm" style={{ color: '#D4AF37' }}>
                    <Star size={14} className="inline -mt-0.5" /> {listing.sellerRating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-xs font-heading font-bold uppercase" style={{ color: '#6B7280' }}>New Seller</span>
                )}
              </div>

              <div className="card-accent p-5">
                <h2 className="font-heading text-base font-bold uppercase mb-3" style={{ color: '#003BFF' }}>About This Account</h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#6B7280' }}>
                  {listing.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {listing.featuredPlayers?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-heading text-base font-bold uppercase mb-3" style={{ color: '#003BFF' }}>Featured Players</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.featuredPlayers.map((player, i) => (
                    <PlayerBadge key={i} playerName={player} />
                  ))}
                </div>
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="p-6">
                <h2 className="font-heading text-base font-bold uppercase mb-4" style={{ color: '#003BFF' }}>Account Stats</h2>
                <div className="space-y-0">
                  {statRows.map((row, i) => (
                    <div key={row.key} className="flex items-center justify-between py-3 px-4" style={{ background: i % 2 === 0 ? '#F5F5F5' : '#FFFFFF' }}>
                      <span className="text-sm" style={{ color: '#6B7280' }}>{row.label}</span>
                      <span className="text-sm font-heading font-bold" style={{ color: '#111111' }}>
                        {listing[row.key]?.toLocaleString() || '0'}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3 px-4" style={{ background: '#F5F5F5' }}>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Platform</span>
                    <span className="text-sm font-heading font-bold" style={{ color: '#111111' }}>{platformInfo.label}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 px-4" style={{ background: '#FFFFFF' }}>
                    <span className="text-sm" style={{ color: '#6B7280' }}>Konami Link Type</span>
                    <span className="text-sm font-heading font-bold capitalize" style={{ color: '#111111' }}>{listing.konamiLinkType?.replace('_', ' ') || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-heading text-base font-bold uppercase mb-4" style={{ color: '#003BFF' }}>
                Buyer Reviews ({reviews.length})
              </h2>
              {reviews.length === 0 ? (
                <p className="text-sm" style={{ color: '#6B7280' }}>No reviews yet.</p>
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
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-2xl p-6 card-blue">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Price</p>
                <p className="font-heading text-4xl font-extrabold mb-4" style={{ color: '#FFF100' }}>
                  {formatKES(listing.price)}
                </p>

                <div className="flex items-center gap-2 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-heading font-bold" style={{ background: '#001E7A' }}>
                    {(listing.sellerDisplayName || 'S')[0]}
                  </div>
                  <div>
                    <Link to={`/seller/${listing.sellerId}`} className="text-sm font-heading font-bold text-white hover:underline">{listing.sellerDisplayName}</Link>
                    <br />
                    <Link to={`/seller/${listing.sellerId}`} className="text-xs text-white/50 hover:underline">View Seller Profile</Link>
                    <div className="flex items-center gap-1">
                      {listing.sellerRating > 0 ? (
                        <>
                          <Star size={12} color="#D4AF37" fill="#D4AF37" />
                          <span className="text-xs text-white/60">{listing.sellerRating.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-xs text-white/40 font-heading font-bold uppercase">New Seller</span>
                      )}
                      <span className="text-xs text-white/40">· {listing.sellerTotalSales || 0} sales</span>
                    </div>
                  </div>
                </div>

                {isSold ? (
                  <div className="space-y-3">
                    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(200,16,46,0.2)' }}>
                      <p className="text-sm font-heading font-bold" style={{ color: '#C8102E' }}>SOLD — Not available</p>
                    </div>
                    <Link to="/browse" className="btn-secondary w-full text-center text-sm block !border-white/40 !text-white/80">
                      Browse Other Accounts
                    </Link>
                  </div>
                ) : isOwner ? (
                  <div>
                    <p className="text-sm text-white/60 mb-3">This is your listing</p>
                    <Link to={`/transfer-room/edit/${listing.id}`} className="btn-secondary w-full text-center text-sm block">
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

                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <Shield size={16} className="text-white/70 mt-0.5 shrink-0" />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Payment held in escrow until you confirm receipt
                  </p>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden bg-white shadow-card border border-konami-mid-gray">
                <button
                  onClick={() => setShowSteps(!showSteps)}
                  className="w-full flex items-center justify-between p-4 text-sm font-heading font-bold uppercase transition-colors"
                  style={{ color: '#003BFF' }}
                >
                  How does this work?
                  {showSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showSteps && (
                  <div className="px-4 pb-4 space-y-2">
                    {howItWorksSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm" style={{ color: '#6B7280' }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-heading font-bold text-white shrink-0 mt-0.5"
                          style={{ background: '#003BFF' }}>
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
