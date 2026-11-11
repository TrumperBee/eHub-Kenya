// Single source of truth for the marketplace payout split.
//
// The platform keeps 5% of every sale; the seller receives the rest. The fee is
// rounded to the nearest shilling ONCE, and the payout is derived by
// subtraction so the two figures always add back up to the sale amount.
export const PLATFORM_FEE_RATE = 0.05;

const toAmount = (amount) => {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const platformFee = (amount) => Math.round(toAmount(amount) * PLATFORM_FEE_RATE);

export const sellerPayout = (amount) => {
  const n = toAmount(amount);
  return n - platformFee(n);
};

/** The moment an order became "completed", with sensible legacy fallbacks. */
export const completedAtMs = (order) => {
  const value =
    order?.completedAt || order?.resolvedAt || order?.updatedAt || order?.createdAt;
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
};
