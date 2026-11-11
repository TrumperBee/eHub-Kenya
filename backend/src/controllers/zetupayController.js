const { admin, adminDb } = require('../services/firebaseAdmin');
const { initiateStkPush, verifyWebhookSignature, normalizePhone } = require('../services/zetupayService');
const { assertValidTransition } = require('../services/orderStateMachine');
const { getEATDateString } = require('../utils/fridayDropScheduler');

const PHONE_RE = /^2547\d{8}$/;

/**
 * A live Friday Drop (approved, bound to today's EAT date) overrides the price
 * the marketplace display shows and therefore the price the buyer pays. Resolve
 * it from the backend so the stored order amount matches what the buyer saw.
 * Non-fatal: if no live drop is found, listing.price is used.
 */
async function resolveEffectivePrice(listingId) {
  const todayEAT = getEATDateString(new Date());
  try {
    const dropSnap = await adminDb
      .collection('fridayDrops')
      .where('listingId', '==', listingId)
      .get();
    const live = dropSnap.docs.find((d) => {
      const dd = d.data();
      return dd.status === 'approved' && dd.fridayDateISO === todayEAT && Number(dd.dropPrice) > 0;
    });
    return live ? Number(live.data().dropPrice) : null;
  } catch (err) {
    console.warn('Drop price lookup failed, falling back to listing price:', err.message);
    return null;
  }
}

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
 * POST /api/payment/stk-push (auth required)
 * Atomically reserve the listing + create a pending order, then trigger the
 * M-Pesa STK Push. Returns the order id so the client can poll status.
 */
async function initiateStkPushPayment(req, res) {
  const { listingId, phone } = req.body || {};
  const buyerId = req.user.uid;

  if (!listingId || !phone) {
    return res.status(400).json({ error: 'listingId and phone are required' });
  }

  const normalizedPhone = normalizePhone(phone);
  if (!PHONE_RE.test(normalizedPhone)) {
    return res.status(400).json({ error: 'Enter a valid M-Pesa number (e.g. 0712345678)' });
  }

  const listingRef = adminDb.doc(`listings/${listingId}`);
  const orderRef = adminDb.collection('orders').doc();
  const orderId = orderRef.id;

  let listing = null;
  let amountToCharge = null;

  try {
    const dropPrice = await resolveEffectivePrice(listingId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(listingRef);
      if (!snap.exists) throw new Error('LISTING_NOT_FOUND');

      const data = snap.data();
      if (data.status !== 'active') throw new Error('LISTING_UNAVAILABLE');
      if (data.sellerId === buyerId) throw new Error('OWN_LISTING');

      listing = data;
      amountToCharge = dropPrice != null ? dropPrice : data.price;

      tx.set(orderRef, {
        id: orderId,
        buyerId,
        buyerEmail: req.user.email || '',
        buyerDisplayName: req.user.name || req.user.email || 'Buyer',
        sellerId: data.sellerId,
        sellerDisplayName: data.sellerDisplayName || 'Seller',
        listingId,
        listingTitle: data.title,
        listingTier: data.tier,
        amount: amountToCharge,
        currency: 'KES',
        phone: normalizedPhone,
        paymentPhone: normalizedPhone,
        paymentProvider: 'zetupay',
        paymentStatus: 'pending',
        status: 'pending_payment',
        escrowStatus: 'none',
        buyerConfirmedReceipt: false,
        disputeReason: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(listingRef, {
        status: 'reserved',
        reservedById: buyerId,
        reservedBy: buyerId,
        reservedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    const statusMap = {
      LISTING_NOT_FOUND: [404, 'Listing not found'],
      LISTING_UNAVAILABLE: [400, 'This account is no longer available'],
      OWN_LISTING: [400, 'You cannot buy your own listing'],
    };
    const [status, message] = statusMap[err.message] || [500, 'Payment initialization failed. Try again.'];
    if (!statusMap[err.message]) console.error('ZetuPay initiate error:', err);
    return res.status(status).json({ error: message });
  }

  // Transaction committed — now trigger the STK Push.
  let stk;
  try {
    stk = await initiateStkPush({
      phone: normalizedPhone,
      amount: amountToCharge,
      orderId,
      description: `eHub Kenya — ${listing.title || 'eFootball account'}`,
    });
  } catch (err) {
    console.error('ZetuPay STK push failed:', err?.response?.data || err.message);
    await processFailedPayment(orderId, { reason: 'Could not send the M-Pesa STK push' });
    return res.status(502).json({ error: 'Could not send the M-Pesa request. Please try again.' });
  }

  const zetupayReference = stk?.reference || null;
  await orderRef.update({
    zetupayReference,
    paymentReference: zetupayReference,
    stkPushSentAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({
    success: true,
    orderId,
    message: 'STK push sent. Enter your M-Pesa PIN on your phone to complete payment.',
    zetupayReference,
  });
}

/**
 * POST /api/payment/zetupay/callback (no auth)
 * Verifies the webhook signature, then applies the payment outcome. Always
 * returns 200 so ZetuPay stops retrying (even on a bad signature).
 */
async function handleZetupayWebhook(req, res) {
  try {
    const signature = req.headers['x-zetupay-signature'] || req.headers['x-signature'];
    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body || {}));

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('ZetuPay webhook: invalid signature — acknowledging without processing');
      return res.status(200).json({ received: true });
    }

    const event = req.body || {};
    const status = String(event.status || '').toUpperCase();
    const orderId = event.reference;

    if (orderId) {
      if (status === 'SUCCESS') {
        await processSuccessfulPayment(orderId, event);
      } else if (status === 'FAILED' || status === 'CANCELLED') {
        await processFailedPayment(orderId, event);
      }
    }
  } catch (err) {
    console.error('ZetuPay webhook error:', err);
  }
  return res.status(200).json({ received: true });
}

/**
 * Internal: transition a paid order pending_payment -> awaiting_seller_delivery.
 * Idempotent via a Firestore transaction (a repeated webhook is a no-op).
 */
async function processSuccessfulPayment(orderId, event = {}) {
  if (!orderId) return;
  const orderRef = adminDb.doc(`orders/${orderId}`);

  let state = null;
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return;

    const current = snap.data();
    if (current.status !== 'pending_payment') return; // already handled / cancelled

    assertValidTransition(current.status, 'awaiting_seller_delivery');

    const data = event.data || {};
    const transactionId =
      event.transactionId ||
      event.transaction_id ||
      data.transactionId ||
      data.transaction_id ||
      event.id ||
      data.id ||
      current.zetupayReference ||
      null;
    const receipt =
      event.mpesaReceiptNumber ||
      event.mpesa_receipt_number ||
      event.receipt ||
      data.mpesaReceiptNumber ||
      data.mpesa_receipt_number ||
      data.receipt ||
      null;

    tx.update(orderRef, {
      status: 'awaiting_seller_delivery',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      zetupayTransactionId: transactionId != null ? String(transactionId) : null,
      paymentTransactionId: transactionId != null ? String(transactionId) : null,
      mpesaReceiptNumber: receipt != null ? String(receipt) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    state = { ...current, id: orderId };
  });

  if (!state) return;

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

  return { orderId };
}

/**
 * Internal: mark a pending order payment_failed and release its reservation.
 * Skips orders that are no longer pending_payment.
 */
async function processFailedPayment(orderId, event = {}) {
  if (!orderId) return;
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
      failureReason: event.reason || event.message || 'Payment was not completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    state = { ...current, id: orderId };
  });

  if (!state) return;

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

  return { orderId };
}

/**
 * GET /api/payment/order-status/:orderId (auth required)
 * Only the buyer or seller of the order may read it.
 */
async function getOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const uid = req.user.uid;

    const snap = await adminDb.doc(`orders/${orderId}`).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = snap.data();
    if (order.buyerId !== uid && order.sellerId !== uid) {
      return res.status(403).json({ error: 'You are not a participant in this order' });
    }

    return res.json({
      orderId,
      status: order.status,
      escrowStatus: order.escrowStatus || 'none',
      amount: order.amount,
      listingTitle: order.listingTitle,
      paidAt: order.paidAt || null,
    });
  } catch (err) {
    console.error('ZetuPay order status error:', err);
    return res.status(500).json({ error: 'Could not fetch order status' });
  }
}

module.exports = {
  initiateStkPushPayment,
  handleZetupayWebhook,
  getOrderStatus,
};
