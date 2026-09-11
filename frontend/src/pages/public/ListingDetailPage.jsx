import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, orderBy, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getListingById, incrementViewCount } from '../../services/listingsService';
import { useAuth } from '../../context/AuthContext';
import { useFridayDrop } from '../../context/FridayDropContext';
import { TIERS, PLATFORMS } from '../../utils/constants';
import { formatKES } from '../../utils/formatters';
import { formatFridayLabel } from '../../utils/fridayUtils';
import TierBadge from '../../components/listings/TierBadge';
import PlayerBadge from '../../components/listings/PlayerBadge';
import ReviewCard from '../../components/reviews/ReviewCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PayNowButton from '../../components/checkout/PayNowButton';
import SaveButton from '../../components/listings/SaveButton';
import CommentSection from '../../components/comments/CommentSection';
import { toggleSaveListing, subscribeSavedListingIds } from '../../services/savedListingsService';
import { ChevronDown, ChevronUp, Shield, Star, Circle, ChevronRight, Bookmark, Flame, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const statRows = [
  { label: 'Gold Coins', key: 'goldCoins' },
  { label: 'GP', key: 'gp' },
];

export default function ListingDetailPage() {
  const { id } = useParams();
  const { currentUser, userProfile } = useAuth();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [sellerSales, setSellerSales] = useState(0);

  // Subscribe to saved listings
  useEffect(() => {
    if (!currentUser || !listing) return;
    const unsubscribe = subscribeSavedListingIds(currentUser.uid, (ids) => {
      setIsSaved(ids.includes(listing.id));
    });
    return unsubscribe;
  }, [currentUser, listing]);

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
        document.title = `${listingData.title} - eFootball Hub Kenya`;
        if (listingData.sellerId) {
          getDocs(query(
            collection(db, 'orders'),
            where('sellerId', '==', listingData.sellerId)
          ))
            .then((snap) => {
              const completed = snap.docs.filter((d) => d.data().status === 'completed').length;
              setSellerSales(completed || 0);
            })
            .catch(() => {});
        }
      }
    });
    return () => { document.title = 'eFootball Hub Kenya - Buy & Sell eFootball Accounts with Paystack'; };
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

  const handleToggleSave = async () => {
    if (!currentUser) {
      toast.error('Login to save listings');
      return;
    }
    try {
      const nowSaved = await toggleSaveListing(currentUser.uid, listing);
      setIsSaved(nowSaved);
      toast.success(nowSaved ? 'Saved to your list' : 'Removed from saved');
    } catch (err) {
      toast.error('Failed to save listing');
    }
  };
  const platformInfo = PLATFORMS[listing.platform] || { label: listing.platform };
  const isOwner = currentUser && listing.sellerId === currentUser.uid;
  const photos = listing.photos || [];
  const isSold = listing.status === 'sold';
  const isReserved = listing.status === 'reserved';
  const isUnavailable = isSold || isReserved;

  const { getDropForListing } = useFridayDrop();
  const fridayDrop = getDropForListing(listing.id) || null;
  const dropLive = fridayDrop?.state === 'live';
  const dropUpcoming = fridayDrop?.state === 'scheduled';
  const effectivePrice = dropLive && fridayDrop ? fridayDrop.dropPrice : listing.price;
  const dropGoLiveLabel = fridayDrop ? `${formatFridayLabel(fridayDrop.fridayDateISO)} (12:00 AM EAT)` : '';

  const howItWorksSteps = [
    'Find your desired account and click "Buy Now"',
    'Pay securely via Paystack — mobile money, card, or bank transfer',
    'Your payment is held in escrow until you confirm delivery',
    'The seller submits the eFootball account login details in your order',
    'Confirm delivery to release funds to the seller',
  ];

  return (
    <div className="pt-[68px] min-h-screen" style={{ background: '#F5F5F5' }}>
      {isUnavailable && (
        <div className="py-3" style={{ background: '#C8102E' }}>
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <p className="text-sm text-white font-heading font-bold uppercase tracking-wider">
              {isSold ? 'THIS ACCOUNT HAS BEEN SOLD' : 'THIS ACCOUNT IS BEING DELIVERED TO ANOTHER BUYER'}
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

            {/* Discussion / Comments Section */}
            <CommentSection listingId={listing.id} sellerId={listing.sellerId} />
          </div>

          <div className="lg:w-[380px] shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-2xl p-6 card-blue">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Price</p>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {dropLive && fridayDrop ? (
                      <>
                        <p className="font-heading text-4xl font-extrabold" style={{ color: '#FFF100' }}>
                          {formatKES(fridayDrop.dropPrice)}
                        </p>
                        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'line-through' }}>
                          Was {formatKES(fridayDrop.regularPrice)}
                        </p>
                      </>
                    ) : (
                      <p className="font-heading text-4xl font-extrabold" style={{ color: '#FFF100' }}>
                        {formatKES(listing.price)}
                      </p>
                    )}
                  </div>
                  <SaveButton
                    listing={listing}
                    isSaved={isSaved}
                    onToggle={handleToggleSave}
                    size="md"
                  />
                </div>
                {isSaved
                  ? <p className="text-white/50 text-xs text-center">Saved to your account</p>
                  : <p className="text-white/50 text-xs text-center">Save for later</p>
                }

                {fridayDrop && (
                  <div
                    className="mb-4 p-3 rounded-xl flex items-start gap-2"
                    style={{
                      background: dropLive ? 'rgba(200,16,46,0.18)' : 'rgba(255,241,0,0.15)',
                      border: `1px solid ${dropLive ? '#C8102E' : 'rgba(255,241,0,0.6)'}`,
                    }}
                  >
                    <span className="mt-0.5 shrink-0" style={{ color: dropLive ? '#C8102E' : '#FFF100' }}>
                      <Flame size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-heading text-xs font-extrabold uppercase tracking-wide" style={{ color: '#FFFFFF' }}>
                        Friday Drop {dropLive ? 'LIVE' : 'UPCOMING'}
                      </p>
                      <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {dropLive
                          ? `${formatKES(fridayDrop.dropPrice)} now, was ${formatKES(fridayDrop.regularPrice)}`
                          : `Drops ${dropGoLiveLabel}. Pricing shown then.`}
                        {dropLive ? '' : ` Drop price: ${formatKES(fridayDrop.dropPrice)} (was ${formatKES(fridayDrop.regularPrice)}).`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <Link
                    to={`/seller/${listing.sellerId}`}
                    className="flex items-center gap-3 p-3 rounded-xl
                               bg-white/10 hover:bg-white/20 active:scale-[0.98]
                               border border-white/20 hover:border-white/40
                               transition-all duration-150 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-konami-blue-dark border-2 border-white/30
                                    flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {listing.sellerPhotoURL
                        ? <img src={listing.sellerPhotoURL} className="w-full h-full object-cover" alt="" />
                        : <span className="text-white font-heading font-bold text-sm">
                            {listing.sellerDisplayName?.[0]?.toUpperCase()}
                          </span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-white text-sm uppercase tracking-wide truncate">
                        {listing.sellerDisplayName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={11} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-white/70 text-xs">
                          {listing.sellerRating > 0 ? listing.sellerRating.toFixed(1) : 'New Seller'}
                        </span>
                        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
                        <span className="text-white/70 text-xs">{sellerSales} sale{sellerSales === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/50 group-hover:text-white transition-colors" />
                  </Link>
                </div>
                <p className="text-white/40 text-[11px] text-center mt-1">
                  Tap to view seller profile and reviews
                </p>

                {isUnavailable ? (
                  <div className="space-y-3">
                    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(200,16,46,0.2)' }}>
                      <p className="text-sm font-heading font-bold" style={{ color: '#C8102E' }}>
                        {isSold ? 'SOLD - Not available' : 'RESERVED - Completing delivery'}
                      </p>
                    </div>
                    <Link to="/browse" className="btn-secondary w-full text-center text-sm block !border-white/40 !text-white/80">
                      Browse Other Accounts
                    </Link>
                  </div>
                ) : isOwner ? (
                  <div className="mb-4">
                    <p className="text-sm text-white/60 mb-3">This is your listing</p>
                    <Link to={`/transfer-room/edit/${listing.id}`} className="btn-secondary w-full text-center text-sm block">
                      Edit Listing
                    </Link>
                  </div>
                ) : !currentUser ? (
                  <Link to="/login" className="btn-primary w-full text-lg py-4 mb-4 block text-center">
                    Login to Buy
                  </Link>
                ) : dropUpcoming ? (
                  <div className="mb-4">
                    <button
                      disabled
                      className="btn-primary w-full text-lg py-4 opacity-70 cursor-not-allowed"
                      title={`Available ${dropGoLiveLabel} – 11:59 PM EAT`}
                    >
                      Friday Drop - {formatKES(effectivePrice)}
                    </button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <PayNowButton listing={listing} effectivePrice={effectivePrice} />
                    <p className="text-white/40 text-[11px] text-center mt-2">
                      Secured by Paystack · All payment methods handled in secure checkout
                    </p>
                  </div>
                )}

                {!isUnavailable && !isOwner && listing.sellerWhatsapp && (
                  <button
                    onClick={() => {
                      const phone = listing.sellerWhatsapp.replace(/\D/g, '').replace(/^0/, '254');
                      const msg = encodeURIComponent(
                        `Hello, I have a question about your listing: ${listing.title}\n${window.location.href}`
                      );
                      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 mb-4
                               bg-white/10 hover:bg-white/20 border border-white/20
                               text-white/70 hover:text-white rounded-xl text-sm
                               font-heading font-bold uppercase tracking-wide transition-all"
                  >
                    <MessageCircle size={16} />
                    Ask Seller a Question
                  </button>
                )}

                <div className="rounded-xl p-3 flex items-start gap-2 mb-4" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <Shield size={16} className="text-white/70 mt-0.5 shrink-0" />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Payment held in escrow until you confirm delivery
                  </p>
                </div>

                <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  <p className="text-white/40 text-[11px] uppercase tracking-widest font-heading mb-3 text-center">
                    Payment Methods
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <div className="bg-white/10 rounded-lg px-3 py-1.5 text-white/70 text-xs font-medium">Mobile Money</div>
                    <div className="bg-white/10 rounded-lg px-3 py-1.5 text-white/70 text-xs font-medium">Visa / Mastercard</div>
                    <div className="bg-white/10 rounded-lg px-3 py-1.5 text-white/70 text-xs font-medium">Bank Transfer</div>
                  </div>
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
    </div>
  );
}
