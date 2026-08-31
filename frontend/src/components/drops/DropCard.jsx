import { useNavigate, Link } from 'react-router-dom';
import { Star, CircleDollarSign, BarChart3, ArrowRight, Flame, ExternalLink, Tag, Smartphone } from 'lucide-react';
import { PLATFORMS } from '../../utils/constants';
import { formatKES } from '../../utils/formatters';
import { classifyDrop, formatFridayLabel } from '../../utils/fridayUtils';
import TierBadge from '../listings/TierBadge';
import PlayerBadge from '../listings/PlayerBadge';

export default function DropCard({ drop, onView }) {
  const navigate = useNavigate();
  const tier = drop.tier || 'bronze';
  const platformLabel = PLATFORMS[drop.platform]?.label || drop.platform || 'eFootball';
  const photoUrl = drop.photo;
  const discount = drop.discountPercent || 0;
  const state = classifyDrop(drop);
  const isLive = state === 'live';

  const handleOpen = () => {
    if (!isLive) return;
    if (onView) onView(drop);
    navigate(`/listing/${drop.listingId}`);
  };

  return (
    <div
      onClick={isLive ? handleOpen : undefined}
      className="group rounded-2xl overflow-hidden transition-all duration-250 bg-white"
      style={{
        border: '1px solid #E0E0E0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        cursor: isLive ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 40px rgba(200,16,46,0.18)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
      }}
    >
      <div className="flex items-center justify-center gap-1.5 h-8" style={{ background: '#FFF100' }}>
        <Flame size={14} style={{ color: '#C8102E' }} />
        <span className="font-heading text-[11px] font-extrabold uppercase tracking-[0.25em]" style={{ color: '#111111' }}>
          Friday Drop
        </span>
      </div>

      <div className="relative aspect-[16/9] overflow-hidden" style={{ background: 'linear-gradient(135deg, #001E7A, #003BFF)' }}>
        {photoUrl ? (
          <img src={photoUrl} alt={drop.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ color: 'rgba(255,255,255,0.3)' }}><Flame size={56} /></span>
          </div>
        )}

        <div className="absolute top-3 left-3 z-10">
          <TierBadge tier={tier} />
        </div>

        <div
          className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg px-2.5 py-1"
          style={{ background: '#C8102E', color: '#FFFFFF' }}
        >
          <Tag size={12} />
          <span className="font-heading text-sm font-extrabold">-{discount}%</span>
        </div>

        <div
          className="absolute bottom-3 left-3 z-10 rounded-full px-3 py-1 text-[11px] font-heading font-bold uppercase tracking-wide"
          style={{ background: 'rgba(0,30,122,0.9)', color: '#FFF100', border: '1px solid rgba(255,241,0,0.4)' }}
        >
          <Smartphone size={12} className="inline mr-1" />
          {platformLabel}
        </div>
      </div>

      <div className="p-5 space-y-3">
        <h3 className="font-heading text-lg font-bold uppercase leading-snug line-clamp-2" style={{ color: '#111111' }}>
          {drop.title || 'Untitled Account'}
        </h3>

        <Link
          to={`/seller/${drop.sellerId}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border transition-all duration-150 group/seller"
          style={{ borderColor: 'rgba(0,59,255,0.3)' }}
        >
          <div className="w-5 h-5 rounded-full bg-[#003BFF] flex items-center justify-center overflow-hidden flex-shrink-0">
            {drop.sellerPhotoURL ? (
              <img src={drop.sellerPhotoURL} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className="text-white font-heading font-bold text-[9px]">
                {(drop.sellerName || 'S')[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <span className="font-heading font-bold text-xs uppercase tracking-wide" style={{ color: '#003BFF' }}>
            {drop.sellerName || 'Verified Seller'}
          </span>
          <ExternalLink size={11} style={{ color: 'rgba(0,59,255,0.6)' }} />
        </Link>

        <div className="grid grid-cols-3 gap-2 rounded-xl p-[10px]" style={{ background: '#F5F5F5' }}>
          <div className="text-center">
            <p className="font-heading text-[13px] font-bold" style={{ color: '#111111' }}>
              <Star size={14} className="inline" /> {drop.fiveStarCount || 0}
            </p>
            <p className="text-[11px]" style={{ color: '#6B7280' }}>Stars</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-[13px] font-bold" style={{ color: '#111111' }}>
              <CircleDollarSign size={14} className="inline" /> {drop.goldCoins?.toLocaleString() || 0}
            </p>
            <p className="text-[11px]" style={{ color: '#6B7280' }}>Coins</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-[13px] font-bold" style={{ color: '#111111' }}>
              <BarChart3 size={14} className="inline" /> {drop.gp?.toLocaleString() || 0}
            </p>
            <p className="text-[11px]" style={{ color: '#6B7280' }}>GP</p>
          </div>
        </div>

        {(drop.featuredPlayers || []).length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {(drop.featuredPlayers || []).slice(0, 3).map((player, i) => (
              <PlayerBadge key={i} playerName={player} />
            ))}
            {(drop.featuredPlayers || []).length > 3 && (
              <span className="text-xs" style={{ color: '#6B7280' }}>+{(drop.featuredPlayers || []).length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-end justify-between pt-3" style={{ borderTop: '1px solid #E0E0E0' }}>
          <div>
            <p className="text-sm font-medium truncate" style={{ color: '#9CA3AF', textDecoration: 'line-through' }}>
              {formatKES(drop.regularPrice || 0)}
            </p>
            <p className="font-heading text-2xl font-extrabold" style={{ color: '#C8102E' }}>
              {formatKES(drop.dropPrice || 0)}
            </p>
          </div>
          <button
            onClick={handleOpen}
            disabled={!isLive}
            className="font-heading text-[13px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-xl transition-all duration-200 active:scale-95"
            style={{
              background: isLive ? '#003BFF' : 'rgba(0,30,122,0.1)',
              color: isLive ? '#FFFFFF' : '#1E3A8A',
            }}
          >
            {isLive ? (
              <>Grab Deal <ArrowRight size={14} className="inline" /></>
            ) : (
              <>Live {formatFridayLabel(drop.fridayDateISO)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}