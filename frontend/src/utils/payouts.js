// Single source of truth for the marketplace payout split.
//
// Fee holiday: the platform currently deducts nothing, so the seller receives
// the full sale amount. Public fee copy has been removed from the site —
// restore 0.05 (and the copy) when the holiday ends.
export const PLATFORM_FEE_RATE = 0;

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
