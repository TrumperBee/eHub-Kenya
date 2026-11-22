// Copy for the seller-approval welcome email, kept free of Firebase/Resend
// imports so it can be verified in tests without booting any infrastructure.

const { PLATFORM_FEE_RATE } = require('./payouts');

const WELCOME_SUBJECT = "🎉 You're approved as an eHub Market Seller!";

const CONGRATULATIONS =
  'Your seller account has been approved. You can now list eFootball accounts on eHub Market.';

const HOW_IT_WORKS_STEPS = [
  { title: 'Post listing', body: 'Add an eFootball account you actually own to your Transfer Room.' },
  { title: 'Buyer pays', body: 'Payment is held securely in escrow while you prepare the account.' },
  { title: 'You receive order', body: 'Open the order from your Transfer Room and check the buyer’s notes.' },
  {
    title: 'Submit credentials within 5 hours',
    body: 'Enter the account login details on the order page within 5 hours of payment confirmation.',
  },
];

const SELLER_RULES = [
  'Submit credentials within 5 hours of payment confirmation or your account will be warned',
  'Accounts with 3 warnings will be permanently suspended',
  'Only list accounts you actually own and can deliver',
  'No fake listings — this results in immediate ban',
];

const FIRST_PAYOUT_COPY =
  'After the buyer confirms delivery, the admin will send your payout to the M-Pesa number registered on your account within 24 hours.';

const WHATSAPP_URL = 'https://wa.me/254713079528';

// Public fee copy follows the live payout rate so it can never claim a fee the
// marketplace is not currently charging (or go stale when the rate changes).
const feeRule = () => (PLATFORM_FEE_RATE > 0
  ? `Platform fee is ${Math.round(PLATFORM_FEE_RATE * 100)}% deducted from your payout.`
  : 'There is no platform fee right now — you receive the full sale amount.');

module.exports = {
  WELCOME_SUBJECT,
  CONGRATULATIONS,
  HOW_IT_WORKS_STEPS,
  SELLER_RULES,
  FIRST_PAYOUT_COPY,
  WHATSAPP_URL,
  feeRule,
};
