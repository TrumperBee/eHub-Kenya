// Seller notice sent after an admin records a manual payout.
//
// Dependencies are injected so the ordering guarantee — Firestore is written
// first, then the seller is notified — can be tested without Firebase/Resend.
// Delivery is best-effort: a Resend or notification failure never turns an
// already-saved payout into a failed admin action.

const logger = require('../utils/logger');
const { buildPayoutSentMessage, payoutPhoneLast4 } = require('../utils/payoutSentCopy');

async function notifySellerPayoutSent({
  uid,
  orderId,
  amount,
  phoneNumber,
  sellerName = '',
  listingTitle = '',
  sendEmail,
  createNotification,
}) {
  if (!uid || !orderId) return { status: 'skipped' };
  if (typeof sendEmail !== 'function' || typeof createNotification !== 'function') {
    throw new Error('notifySellerPayoutSent: missing dependencies');
  }

  const last4 = payoutPhoneLast4(phoneNumber);
  const message = buildPayoutSentMessage({ amount, last4 });

  const [emailResult, notificationResult] = await Promise.allSettled([
    Promise.resolve().then(() =>
      sendEmail({ uid, orderId, amount, last4, message, sellerName, listingTitle })
    ),
    Promise.resolve().then(() =>
      createNotification({ userId: uid, title: 'Payout Sent', message, type: 'payment', orderId })
    ),
  ]);

  if (emailResult.status === 'rejected') {
    logger.error(`payout email failed for order ${orderId}: ${emailResult.reason?.message || emailResult.reason}`);
  }
  if (notificationResult.status === 'rejected') {
    logger.error(`payout notification failed for order ${orderId}: ${notificationResult.reason?.message || notificationResult.reason}`);
  }

  return {
    status: 'notified',
    last4,
    email: emailResult.status === 'fulfilled' ? emailResult.value : null,
    notification: notificationResult.status === 'fulfilled' ? notificationResult.value : null,
  };
}

module.exports = { notifySellerPayoutSent };
