// Exact seller-facing copy for a completed manual M-Pesa payout.
// Kept pure so the wording can be tested without Firebase or Resend.

const PAYOUT_SENT_SUBJECT = 'Your eHub Market payout has been sent';

const formatAmount = (amount) => Number(amount || 0).toLocaleString('en-KE');

/** Last four digits of the payout phone, with a safe fallback when missing. */
function payoutPhoneLast4(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : '****';
}

function buildPayoutSentMessage({ amount, last4 }) {
  return (
    `Your payout of KES ${formatAmount(amount)} has been sent to your M-Pesa ` +
    `number ending in ${last4}. Check your M-Pesa.`
  );
}

module.exports = {
  PAYOUT_SENT_SUBJECT,
  buildPayoutSentMessage,
  payoutPhoneLast4,
};
