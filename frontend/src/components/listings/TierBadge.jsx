import { TIERS } from '../../utils/constants';

export default function TierBadge({ tier, size = 'sm' }) {
  const config = TIERS[tier] || TIERS.bronze;
  const isLegendary = tier === 'legendary';

  const sizeClasses = size === 'lg'
    ? 'px-3 py-1 text-sm'
    : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-md ${sizeClasses} ${
        isLegendary ? 'animate-shimmer bg-gradient-to-r from-[#9B59B6] via-[#BF5FFF] to-[#9B59B6] bg-[length:200%_100%]' : ''
      }`}
      style={{
        backgroundColor: isLegendary ? undefined : config.color,
        color: tier === 'silver' ? '#0D0D0D' : '#FFFFFF',
      }}
    >
      {config.label}
    </span>
  );
}
