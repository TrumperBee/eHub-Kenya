import { getTierFromSalesCount } from '../../utils/sellerTier';

// Text-only seller trust badge. Intentionally separate from TierBadge, which
// describes an account's squad tier, not the seller's completed sales.
export default function SellerTierBadge({ count, className = '' }) {
  const tier = getTierFromSalesCount(count);
  const textColor = tier.label === 'TOP SELLER' ? '#111111' : '#FFFFFF';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-heading text-[10px] font-bold uppercase leading-none tracking-wide whitespace-nowrap ${className}`}
      style={{ background: tier.color, color: textColor }}
      aria-label={`${tier.label} seller tier`}
    >
      {tier.label}
    </span>
  );
}
