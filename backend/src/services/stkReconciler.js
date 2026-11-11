const { adminDb } = require('./firebaseAdmin');
const { getPaymentStatus } = require('./zetupayService');
const { processSuccessfulPayment, processFailedPayment } = require('./paymentOutcomeService');

/**
 * ZetuPay sends no webhook when a buyer cancels or ignores an STK prompt, so an
 * abandoned prompt would leave its order pending and its listing reserved
 * forever. The client polls while the checkout UI is open; this sweep covers
 * the case where the tab was closed before the prompt expired.
 *
 * Runs from the existing stats/escrow background worker. Idempotent: the
 * outcome processors ignore orders that are no longer pending_payment.
 */
const DEFAULT_MIN_AGE_MS = 150 * 1000; // prompts expire after ~60s; allow margin
const SWEEP_LIMIT = 25;

async function reconcileStaleStkPayments({ minAgeMs = DEFAULT_MIN_AGE_MS, limit = SWEEP_LIMIT } = {}) {
  const cutoff = Date.now() - minAgeMs;
  const result = { checked: 0, succeeded: 0, failed: 0, skipped: 0 };

  let snap;
  try {
    // Equality-only filter — no composite index required. The (small) pending
    // set is age-filtered in memory.
    snap = await adminDb
      .collection('orders')
      .where('status', '==', 'pending_payment')
      .limit(limit)
      .get();
  } catch (err) {
    console.warn('[stk-sweep] could not query pending orders:', err.message);
    return result;
  }

  for (const docSnap of snap.docs) {
    const order = docSnap.data();
    if (order.paymentProvider !== 'zetupay' || !order.zetupayPaymentKey) {
      result.skipped += 1;
      continue;
    }

    const sentAt = order.stkPushSentAt?.toMillis?.();
    if (!sentAt || sentAt > cutoff) {
      result.skipped += 1;
      continue;
    }

    result.checked += 1;

    let payment;
    try {
      payment = await getPaymentStatus(order.zetupayPaymentKey);
    } catch (err) {
      // Do NOT fail the order on a lookup error: the provider may still be
      // processing the prompt (or briefly misbehaving), and failing early would
      // cause a later successful webhook to be ignored.
      console.warn('[stk-sweep] status check failed for order', docSnap.id, err?.message);
      continue;
    }

    const status = String(payment?.status || '').toLowerCase();
    try {
      if (status === 'success') {
        const { processed } = await processSuccessfulPayment(docSnap.id, payment);
        if (processed) result.succeeded += 1;
      } else if (['failed', 'cancelled', 'expired'].includes(status)) {
        const { processed } = await processFailedPayment(docSnap.id, {
          reason: payment.resultDesc || `Payment ${status}`,
        });
        if (processed) result.failed += 1;
      }
    } catch (err) {
      console.error('[stk-sweep] could not apply outcome for order', docSnap.id, err.message);
    }
  }

  if (result.checked > 0) {
    console.log(
      `[stk-sweep] checked ${result.checked} pending payment(s): ` +
      `${result.succeeded} paid, ${result.failed} failed, ${result.skipped} skipped`
    );
  }

  return result;
}

module.exports = { reconcileStaleStkPayments };
