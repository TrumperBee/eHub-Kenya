const { admin, adminDb } = require('./firebaseAdmin');
const { assertValidTransition } = require('./orderStateMachine');

/**
 * Shared payment outcome processing for ZetuPay orders. Used by the webhook,
 * the client status endpoint, and the background sweep, so every path applies
 * exactly the same transitions and side effects.
 */

async function createNotification({ userId, title, message, type, orderId }) {
  try {
    if (!userId) return;
    await adminDb.collection('notifications').add({
      userId,
      title,
      message,
      type,
      orderId: orderId || null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('ZetuPay notification error:', err.message);
  }
}

// Fire-and-forget public counter bump. The background reconciler recomputes
// these from source-of-truth on its next pass, so a failure here is harmless.
function bumpStats() {
  return adminDb
    .doc('stats/global')
    .set(
      {
        totalSalesCompleted: admin.firestore.FieldValue.increment(1),
        transactionsProcessed: admin.firestore.FieldValue.increment(1),
      },
      { merge: true }
    )
    .catch((err) => console.error('ZetuPay stats increment failed:', err.message));
}

/**
 * Release a reservation back to 'active', but only when the listing is still
 * reserved by the same buyer — never clobber a newer reservation.
 */
async function releaseReservation(listingId, buyerId) {
  if (!listingId) return;
  const listingRef = adminDb.doc(`listings/${listingId}`);
  const snap = await listingRef.get();
  if (!snap.exists) return;

  const listing = snap.data();
  const reservedBy = listing.reservedById || listing.reservedBy;
  if (listing.status !== 'reserved' || (buyerId && reservedBy && reservedBy !== buyerId)) return;

  await listingRef.update({
    status: 'active',
    reservedById: admin.firestore.FieldValue.delete(),
    reservedBy: admin.firestore.FieldValue.delete(),
    reservedAt: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Internal: transition a paid order pending_payment -> awaiting_seller_delivery.
 * Idempotent via a Firestore transaction (a repeated webhook is a no-op).
 * The amount and reference are checked against the stored order before the
 * order is fulfilled.
 */
async function processSuccessfulPayment(orderId, event = {}) {
  if (!orderId) return { orderId, processed: false, reason: 'missing_order' };
  const orderRef = adminDb.doc(`orders/${orderId}`);
  const data = event.data || event;

  const paidAmount = Number(event.amount ?? data.amount);
  const reference = event.reference ?? data.reference;

  let outcome = 'not_pending';
  let state = null;

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      outcome = 'not_found';
      return;
    }

    const current = snap.data();
    if (current.status !== 'pending_payment') {
      // Already handled, cancelled, or failed — a retried webhook is a no-op.
      outcome = 'not_pending';
      return;
    }

    if (reference && String(reference) !== String(orderId)) {
      outcome = 'reference_mismatch';
      return;
    }

    if (Number.isFinite(paidAmount) && Math.round(paidAmount) !== Math.round(Number(current.amount))) {
      outcome = 'amount_mismatch';
      return;
    }

    assertValidTransition(current.status, 'awaiting_seller_delivery');

    const transactionId =
      event.waveTransactionId ||
      data.waveTransactionId ||
      current.zetupayWaveTransactionId ||
      event.transactionId ||
      data.transactionId ||
      current.zetupayReference ||
      null;
    const receipt =
      event.receiptNumber ||
      data.receiptNumber ||
      event.mpesaReceiptNumber ||
      data.mpesaReceiptNumber ||
      null;
    const paymentKey = event.paymentKey || data.paymentKey || current.zetupayPaymentKey || null;

    tx.update(orderRef, {
      status: 'awaiting_seller_delivery',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAmount: Number.isFinite(paidAmount) ? paidAmount : null,
      zetupayTransactionId: transactionId != null ? String(transactionId) : null,
      zetupayPaymentKey: paymentKey,
      zetupayWaveTransactionId: transactionId != null ? String(transactionId) : null,
      paymentTransactionId: transactionId != null ? String(transactionId) : null,
      mpesaReceiptNumber: receipt != null ? String(receipt) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    state = { ...current, id: orderId };
    outcome = 'processed';
  });

  if (outcome !== 'processed') {
    if (outcome === 'amount_mismatch' || outcome === 'reference_mismatch') {
      console.error(
        `ZetuPay webhook rejected (${outcome}) for order ${orderId}: ` +
        `paid=${paidAmount}, reference=${reference}`
      );
    }
    return { orderId, processed: false, reason: outcome };
  }

  if (state.listingId) {
    await adminDb
      .doc(`listings/${state.listingId}`)
      .update({
        status: 'sold',
        soldAt: admin.firestore.FieldValue.serverTimestamp(),
        soldTo: state.buyerId || null,
        reservedById: admin.firestore.FieldValue.delete(),
        reservedBy: admin.firestore.FieldValue.delete(),
        reservedAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch((err) => console.error('ZetuPay: mark listing sold failed:', err.message));
  }

  // Fire-and-forget side effects.
  createNotification({
    userId: state.buyerId,
    title: 'Payment Confirmed',
    message: `Your payment for "${state.listingTitle || 'the listing'}" was successful. The seller has been notified to transfer the account.`,
    type: 'payment',
    orderId,
  });
  createNotification({
    userId: state.sellerId,
    title: 'New Sale — Transfer Account Now',
    message: `The buyer has paid for "${state.listingTitle || 'your listing'}". Submit the account details from your Orders page.`,
    type: 'order',
    orderId,
  });
  bumpStats();

  return { orderId, processed: true };
}

/**
 * Internal: mark a pending order payment_failed and release its reservation.
 * Skips orders that are no longer pending_payment.
 */
async function processFailedPayment(orderId, event = {}) {
  if (!orderId) return { orderId, processed: false };
  const orderRef = adminDb.doc(`orders/${orderId}`);

  let state = null;
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return;

    const current = snap.data();
    if (current.status !== 'pending_payment') return;

    tx.update(orderRef, {
      status: 'payment_failed',
      paymentStatus: 'failed',
      failureReason: event.reason || event.resultDesc || event.message || 'Payment was not completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    state = { ...current, id: orderId };
  });

  if (!state) return { orderId, processed: false };

  if (state.listingId) {
    await releaseReservation(state.listingId, state.buyerId).catch((err) =>
      console.error('ZetuPay: release listing failed:', err.message)
    );
  }

  createNotification({
    userId: state.buyerId,
    title: 'Payment Failed — no money deducted',
    message: `Your payment for "${state.listingTitle || 'the listing'}" was not completed and no money was deducted. You can try again.`,
    type: 'payment',
    orderId,
  });

  return { orderId, processed: true };
}

module.exports = {
  processSuccessfulPayment,
  processFailedPayment,
  releaseReservation,
  createNotification,
};
