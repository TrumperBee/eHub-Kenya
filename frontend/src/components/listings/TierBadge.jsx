import { TIERS } from '../../utils/constants';

export default function TierBadge({ tier, size = 'sm' }) {
  const config = TIERS[tier] || TIERS.bronze;
  const isLegendary = tier === 'legendary';

  const bgColors = {
    bronze: '#FFF8F0',
    silver: '#F8F8F8',
    gold: '#FFFBEB',
    legendary: '#F9F0FF',
  };
  const borderColors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#D4AF37',
    legendary: '#9B59B6',
  };

  return (
    <span
      className={`inline-flex items-center font-heading font-bold uppercase tracking-[0.05em] rounded-lg px-[10px] py-[4px] ${
        size === 'lg' ? 'text-xs' : 'text-[11px]'
      } ${isLegendary ? 'animate-shimmer bg-gradient-to-r from-[#F9F0FF] via-[#E8D5FF] to-[#F9F0FF] bg-[length:200%_100%]' : ''}`}
      style={{
        backgroundColor: isLegendary ? undefined : bgColors[tier],
        color: config.color,
        border: `1px solid ${borderColors[tier] || config.color}`,
      }}
    >
      {config.label}
    </span>
  );
}
