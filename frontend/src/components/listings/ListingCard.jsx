import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Smartphone, Star, CircleDollarSign, BarChart3, ArrowRight, Circle, ExternalLink, Bookmark } from 'lucide-react';
import { TIERS, PLATFORMS } from '../../utils/constants';
import { formatKES } from '../../utils/formatters';
import TierBadge from './TierBadge';
import PlayerBadge from './PlayerBadge';
import { toggleSaveListing } from '../../services/savedListingsService';
import toast from 'react-hot-toast';

const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#D4AF37',
  legendary: '#9B59B6',
};

export default function ListingCard({ listing }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const tier = listing.tier || 'bronze';
  const tierAccent = TIER_COLORS[tier];

  const platformLabel = PLATFORMS[listing.platform]?.label || listing.platform || 'eFootball';

  const photoUrl = listing.photos?.[0];
  const isSold = listing.status === 'sold';

  const handleClick = () => {
    navigate(`/listing/${listing.id}`);
  };

  const handleToggleSave = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUser) {
      toast.error('Login to save listings');
      return;
    }
    try {
      const nowSaved = await toggleSaveListing(currentUser.uid, listing);
      toast.success(nowSaved ? 'Saved to Favourites' : 'Removed from Favourites');
    } catch (err) {
      toast.error('Failed to save listing');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-250 bg-white"
      style={{
        border: '1px solid #E0E0E0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,59,255,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
      }}
    >
      <div style={{ height: 4, background: tierAccent }} className={tier === 'legendary' ? 'animate-shimmer' : ''} />

<div className="relative">
          <div className="relative aspect-[16/9] overflow-hidden" style={{ background: 'linear-gradient(135deg, #001E7A, #003BFF)' }}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={listing.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl opacity-60"><Circle size={48} /></span>
              </div>
            )}

            {/* Save button overlay */}
            <div className="absolute top-2 right-2">
              <button
                onClick={handleToggleSave}
                className={`flex items-center justify-center rounded-full
                            transition-all duration-200 active:scale-90
                            w-8 h-8
                            bg-white border border-gray-200 text-gray-400 hover:border-[#003BFF] hover:text-[#003BFF]`}
                aria-label="Save listing"
                title="Save for later"
              >
                <Bookmark size={16} />
              </button>
            </div>

            {isSold && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(200,16,46,0.8)' }}>
              <span className="font-heading text-[28px] font-extrabold text-white uppercase tracking-widest">
                SOLD
              </span>
            </div>
          )}

          <div className="absolute top-3 left-3">
            <TierBadge tier={tier} />
          </div>
          <div className="absolute top-3 right-3 bg-konami-blue text-white rounded-full px-3 py-1 text-xs font-heading font-bold uppercase tracking-wide">
            <Smartphone size={14} /> {platformLabel}
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Link
              to={`/seller/${listing.sellerId}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                         bg-blue-50 border border-konami-blue/30
                         hover:bg-konami-blue hover:text-white hover:border-konami-blue
                         active:scale-95 transition-all duration-150 group"
            >
              <div className="w-5 h-5 rounded-full bg-konami-blue flex items-center justify-center flex-shrink-0">
                {listing.sellerPhotoURL
                  ? <img src={listing.sellerPhotoURL} className="w-5 h-5 rounded-full object-cover" alt="" />
                  : <span className="text-white font-heading font-bold text-[9px]">
                      {listing.sellerDisplayName?.[0]?.toUpperCase() || 'S'}
                    </span>
                }
              </div>
              <span className="font-heading font-bold text-konami-blue group-hover:text-white text-xs uppercase tracking-wide">
                {listing.sellerDisplayName || 'Unknown Seller'}
              </span>
              <ExternalLink size={11} className="text-konami-blue/60 group-hover:text-white flex-shrink-0" />
            </Link>
            {listing.sellerRating > 0 ? (
              <span className="text-sm font-medium" style={{ color: '#D4AF37' }}>
                {listing.sellerRating.toFixed(1)} <Star size={14} className="inline" />
              </span>
            ) : (
              <span className="text-xs font-heading font-bold uppercase" style={{ color: '#6B7280' }}>New Seller</span>
            )}
          </div>

          <h3 className="font-heading text-lg font-bold text-konami-text leading-snug line-clamp-2 uppercase">
            {listing.title || 'Untitled Account'}
          </h3>

          <div className="grid grid-cols-3 gap-2 rounded-xl p-[10px]" style={{ background: '#F5F5F5' }}>
            <div className="text-center">
              <p className="font-heading text-[13px] font-bold" style={{ color: '#111111' }}><Star size={14} className="inline" /> {listing.fiveStarCount || 0}</p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>Stars</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-[13px] font-bold" style={{ color: '#111111' }}><CircleDollarSign size={14} className="inline" /> {listing.goldCoins?.toLocaleString() || 0}</p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>Coins</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-[13px] font-bold" style={{ color: '#111111' }}><BarChart3 size={14} className="inline" /> {listing.gp?.toLocaleString() || 0}</p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>GP</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
            {(listing.featuredPlayers || []).slice(0, 3).map((player, i) => (
              <PlayerBadge key={i} playerName={player} />
            ))}
            {(listing.featuredPlayers || []).length > 3 && (
              <span className="text-xs" style={{ color: '#6B7280' }}>+{listing.featuredPlayers.length - 3}</span>
            )}
          </div>

          <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #E0E0E0' }}>
            <span className="font-heading text-2xl font-extrabold" style={{ color: '#003BFF' }}>
              {formatKES(listing.price || 0)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="btn-primary !py-2 !px-4 text-[13px]"
            >
              VIEW DEAL <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
