import { useNavigate } from 'react-router-dom';
import { TIERS, PLATFORMS } from '../../utils/constants';
import { formatKES } from '../../utils/formatters';
import TierBadge from './TierBadge';
import PlayerBadge from './PlayerBadge';

export default function ListingCard({ listing }) {
  const navigate = useNavigate();
  const tier = listing.tier || 'bronze';
  const tierConfig = TIERS[tier];

  const platformIcon = PLATFORMS[listing.platform]?.icon || '📱';
  const platformLabel = PLATFORMS[listing.platform]?.label || listing.platform;

  const photoUrl = listing.photos?.[0];
  const isSold = listing.status === 'sold';

  const handleClick = () => {
    navigate(`/listing/${listing.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.03]"
      style={{
        backgroundColor: '#1A1A1A',
        border: `1px solid ${tierConfig.color}`,
        boxShadow: `0 0 12px ${tierConfig.glow}`,
      }}
    >
      <div className="relative">
        <div className="relative aspect-[16/9] overflow-hidden bg-[#242424]">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#5C5C5C]">
              <span className="text-3xl mb-1">⚽</span>
              <span className="text-xs">No preview</span>
            </div>
          )}

          {isSold && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#BF0021]/60">
              <div className="bg-[#BF0021] text-white font-heading font-bold text-xl uppercase tracking-widest px-6 py-1 -rotate-12 shadow-lg">
                SOLD
              </div>
            </div>
          )}

          <div className="absolute top-2 left-2">
            <TierBadge tier={tier} />
          </div>
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5 text-xs text-white">
            {platformIcon} {platformLabel}
          </div>
        </div>

        <div className="p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">
              {listing.sellerDisplayName || 'Unknown Seller'}
            </span>
            {listing.sellerRating > 0 ? (
              <span className="text-xs shrink-0" style={{ color: '#D4AF37' }}>
                {listing.sellerRating.toFixed(1)} ★
              </span>
            ) : (
              <span className="text-xs text-[#5C5C5C] shrink-0">New Seller</span>
            )}
          </div>

          <h3 className="text-sm font-medium text-white leading-snug line-clamp-2">
            {listing.title || 'Untitled Account'}
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#242424] rounded-lg px-2 py-1.5 text-center">
              <p className="text-xs text-[#9E9E9E]">Stars</p>
              <p className="text-sm font-bold text-white">⭐ {listing.fiveStarCount || 0}</p>
            </div>
            <div className="bg-[#242424] rounded-lg px-2 py-1.5 text-center">
              <p className="text-xs text-[#9E9E9E]">Coins</p>
              <p className="text-sm font-bold text-white">🪙 {listing.goldCoins?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-[#242424] rounded-lg px-2 py-1.5 text-center">
              <p className="text-xs text-[#9E9E9E]">GP</p>
              <p className="text-sm font-bold text-white">📊 {listing.gp?.toLocaleString() || 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
            {(listing.featuredPlayers || []).slice(0, 3).map((player, i) => (
              <PlayerBadge key={i} playerName={player} />
            ))}
            {(listing.featuredPlayers || []).length > 3 && (
              <span className="text-xs text-[#5C5C5C]">+{listing.featuredPlayers.length - 3}</span>
            )}
            {(!listing.featuredPlayers || listing.featuredPlayers.length === 0) && (
              <span className="text-xs text-[#5C5C5C]">No featured players listed</span>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#2A2A2A]">
            <span className="font-heading text-xl font-bold text-white">
              {formatKES(listing.price || 0)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="bg-[#BF0021] hover:bg-[#E0001B] active:bg-[#8B0018] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200"
            >
              View Deal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
