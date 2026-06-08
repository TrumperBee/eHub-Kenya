import { useNavigate } from 'react-router-dom';
import { TIERS, PLATFORMS } from '../../utils/constants';
import { formatKES } from '../../utils/formatters';
import TierBadge from './TierBadge';
import PlayerBadge from './PlayerBadge';

const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#D4AF37',
  legendary: '#9B59B6',
};

export default function ListingCard({ listing }) {
  const navigate = useNavigate();
  const tier = listing.tier || 'bronze';
  const tierAccent = TIER_COLORS[tier];

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
              <span className="text-5xl opacity-60">⚽</span>
            </div>
          )}

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
            {platformIcon} {platformLabel}
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-heading text-sm font-bold" style={{ color: '#003BFF' }}>
              {listing.sellerDisplayName || 'Unknown Seller'}
            </span>
            {listing.sellerRating > 0 ? (
              <span className="text-sm font-medium" style={{ color: '#D4AF37' }}>
                {listing.sellerRating.toFixed(1)} ★
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
              <p className="font-heading text-[13px] font-bold" style={{ color: '#111111' }}>⭐ {listing.fiveStarCount || 0}</p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>Stars</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-[13px] font-bold" style={{ color: '#111111' }}>🪙 {listing.goldCoins?.toLocaleString() || 0}</p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>Coins</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-[13px] font-bold" style={{ color: '#111111' }}>📊 {listing.gp?.toLocaleString() || 0}</p>
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
              VIEW DEAL →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
