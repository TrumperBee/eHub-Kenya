// Seller trust tiers are derived from completedSalesCount on users/{uid}.
// Missing or invalid values are treated as zero so legacy accounts start at
// NEW SELLER without needing a migration.

export const SELLER_TIERS = Object.freeze([
  Object.freeze({ minSales: 0, label: 'NEW SELLER', color: '#6B7280' }),
  Object.freeze({ minSales: 3, label: 'RISING', color: '#003BFF' }),
  Object.freeze({ minSales: 10, label: 'TRUSTED', color: '#F97316' }),
  Object.freeze({ minSales: 25, label: 'ELITE', color: '#7C3AED' }),
  Object.freeze({ minSales: 50, label: 'TOP SELLER', color: '#CA8A04' }),
]);

export function normalizeSalesCount(count) {
  const value = Number(count);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function getTierFromSalesCount(count) {
  const sales = normalizeSalesCount(count);
  let current = SELLER_TIERS[0];
  for (const tier of SELLER_TIERS) {
    if (sales >= tier.minSales) current = tier;
  }
  return { label: current.label, color: current.color };
}

export function getNextTierProgress(count) {
  const sales = normalizeSalesCount(count);
  const currentIndex = SELLER_TIERS.findIndex((tier, index) =>
    sales >= tier.minSales &&
    (index === SELLER_TIERS.length - 1 || sales < SELLER_TIERS[index + 1].minSales)
  );
  const next = SELLER_TIERS[currentIndex + 1] || null;

  if (!next) {
    return {
      salesRemaining: 0,
      nextLabel: null,
      message: 'TOP SELLER tier reached',
    };
  }

  const salesRemaining = next.minSales - sales;
  return {
    salesRemaining,
    nextLabel: next.label,
    message: `${salesRemaining} more ${salesRemaining === 1 ? 'sale' : 'sales'} to ${next.label}`,
  };
}
