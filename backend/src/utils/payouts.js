// Single source of truth for the marketplace payout split (backend side).
//
// Fee holiday: the platform currently deducts nothing, so sellers receive the
// full sale amount. Public fee copy has been removed from the site — restore
// 0.05 (and the copy in frontend/src/utils/payouts.js) when the holiday ends.
const PLATFORM_FEE_RATE = 0;

const toAmount = (amount) => {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const platformFee = (amount) => Math.round(toAmount(amount) * PLATFORM_FEE_RATE);

const sellerPayout = (amount) => toAmount(amount) - platformFee(amount);

module.exports = { PLATFORM_FEE_RATE, platformFee, sellerPayout };
