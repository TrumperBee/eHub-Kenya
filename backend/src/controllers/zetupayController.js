const { adminDb } = require('../services/firebaseAdmin');
const {
  initiateStkPush,
  getPaymentStatus,
  verifyWebhookSignature,
  normalizePhone,
  isValidMpesaPhone,
  ZetupayError,
  MAX_STK_AMOUNT,
} = require('../services/zetupayService');
const {
  processSuccessfulPayment,
  processFailedPayment,
} = require('../services/paymentOutcomeService');
const { getEATDateString } = require('../utils/fridayDropScheduler');

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

/**
 * Turn a ZetuPay client error into a status + message a buyer can act on.
 * The provider's raw message is logged, never shown verbatim.
 */
function zetupayFailureResponse(err) {
  if (!(err instanceof ZetupayError)) {
    return [502, 'Could not send the M-Pesa request. Please try again.'];
  }
  switch (err.code) {
    case 'INVALID_PHONE':
      return [400, 'Enter a valid M-Pesa number (e.g. 0712345678)'];
    case 'INVALID_AMOUNT':
      return [400, err.message];
    case 'ZETUPAY_NOT_CONFIGURED':
      return [503, 'M-Pesa payments are not configured yet. Please contact support.'];
    case 'ZETUPAY_AUTH_FAILED':
    case 'ZETUPAY_NO_PLAN':
    case 'ZETUPAY_FORBIDDEN':
    case 'ZETUPAY_CHANNEL_NOT_FOUND':
      return [503, 'M-Pesa payments are temporarily unavailable. Please contact support.'];
    case 'ZETUPAY_NOT_SET_UP':
      return [503, 'M-Pesa payments are not set up on our payment account yet. Please contact support.'];
    case 'ZETUPAY_RATE_LIMITED':
      return [429, 'Too many M-Pesa requests. Wait a moment and try again.'];
    case 'ZETUPAY_IDEMPOTENCY_CONFLICT':
      return [409, 'A payment for this order is already in progress. Check your orders page before retrying.'];
    case 'ZETUPAY_MPESA_REJECTED':
      return [502, 'M-Pesa did not accept the request. Check the number and try again.'];
    case 'ZETUPAY_TIMEOUT':
      return [504, 'M-Pesa took too long to respond. Check your phone, then your orders page before retrying.'];
    default:
      return [502, 'Could not send the M-Pesa request. Please try again.'];
  }
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
  if (!isValidMpesaPhone(normalizedPhone)) {
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

  // STK Push only accepts 1..250,000 KES. Fail early with a clear message and
  // release the reservation instead of sending the provider a request it must
  // reject.
  const numericAmount = Math.round(Number(amountToCharge));
  if (!Number.isFinite(numericAmount) || numericAmount < 1 || numericAmount > MAX_STK_AMOUNT) {
    await processFailedPayment(orderId, { reason: 'Amount outside the M-Pesa STK Push limits' });
    return res.status(400).json({
      error: `This listing cannot be paid via M-Pesa. The allowed range is KES 1 to KES ${MAX_STK_AMOUNT.toLocaleString()}. Please contact support.`,
    });
  }

  // Transaction committed — now trigger the STK Push.
  let stk;
  try {
    stk = await initiateStkPush({
      phone: normalizedPhone,
      amount: numericAmount,
      orderId,
      buyerId,
    });
  } catch (err) {
    console.error('ZetuPay STK push failed:', {
      code: err?.code || null,
      status: err?.status || null,
      providerMessage: err?.providerMessage || null,
      message: err?.message,
    });
    await processFailedPayment(orderId, {
      reason: err?.providerMessage || err?.message || 'Could not send the M-Pesa STK push',
    });
    const [status, message] = zetupayFailureResponse(err);
    return res.status(status).json({ error: message });
  }

  const zetupayReference = stk.waveTransactionId || stk.paymentKey || null;
  await orderRef.update({
    zetupayReference,
    // paymentKey is what the status endpoint takes; waveTransactionId is what
    // the webhook reports. Store both so either path can reconcile.
    zetupayPaymentKey: stk.paymentKey || null,
    zetupayWaveTransactionId: stk.waveTransactionId || null,
    zetupayCheckoutRequestId: stk.checkoutRequestId || null,
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
 * Verifies the signed webhook, then applies the payment outcome. Always
 * returns 200 so ZetuPay stops retrying (even on a bad signature).
 *
 * Header: x-zetupay-signature: t=<unix>,v1=<hex HMAC of "<t>.<rawBody>">
 */
async function handleZetupayWebhook(req, res) {
  try {
    const signature = req.headers['x-zetupay-signature'] || req.headers['x-signature'];
    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body || {}));

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('ZetuPay webhook: invalid or stale signature — acknowledging without processing');
      return res.status(200).json({ received: true });
    }

    const event = req.body || {};

    // Subscription events share the transaction callback URL and arrive as
    // { event, data }. They are not payments.
    if (event.event) {
      return res.status(200).json({ received: true });
    }

    const status = String(event.status || '').toLowerCase();
    const orderId = event.reference;

    if (!orderId) {
      console.warn('ZetuPay webhook: missing reference — ignoring');
      return res.status(200).json({ received: true });
    }

    if (status === 'success') {
      await processSuccessfulPayment(orderId, event);
    } else if (['failed', 'cancelled', 'expired'].includes(status)) {
      await processFailedPayment(orderId, event);
    }
  } catch (err) {
    console.error('ZetuPay webhook error:', err);
  }
  return res.status(200).json({ received: true });
}

// Throttle provider status lookups: the client polls every 3s, but ZetuPay
// recommends checking every 5s and rate-limits aggressive callers.
const PROVIDER_CHECK_INTERVAL_MS = 4000;
const lastProviderCheck = new Map();

/**
 * Failed and cancelled STK prompts send no webhook, so a pending order would
 * stay pending (and its listing reserved) forever. While the client polls, ask
 * ZetuPay for the authoritative status and apply a terminal outcome.
 *
 * Only explicit terminal statuses (failed / cancelled / expired) mark the order
 * failed — a network hiccup must never cancel an order whose prompt could still
 * succeed.
 */
async function reconcileWithProvider(orderId, order) {
  const paymentKey = order.zetupayPaymentKey;
  if (!paymentKey) return order;

  const now = Date.now();
  const last = lastProviderCheck.get(orderId) || 0;
  if (now - last < PROVIDER_CHECK_INTERVAL_MS) return order;
  lastProviderCheck.set(orderId, now);

  let payment;
  try {
    payment = await getPaymentStatus(paymentKey);
  } catch (err) {
    console.warn('ZetuPay status check failed:', {
      orderId,
      code: err?.code || null,
      status: err?.status || null,
      message: err?.message,
    });
    return order;
  }

  if (!payment) return order;
  const providerStatus = String(payment.status || '').toLowerCase();

  if (providerStatus === 'success') {
    await processSuccessfulPayment(orderId, payment);
  } else if (['failed', 'cancelled', 'expired'].includes(providerStatus)) {
    await processFailedPayment(orderId, {
      reason: payment.resultDesc || `Payment ${providerStatus}`,
    });
  } else {
    return order;
  }

  const refreshed = await adminDb.doc(`orders/${orderId}`).get();
  return refreshed.exists ? refreshed.data() : order;
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

    let order = snap.data();
    if (order.buyerId !== uid && order.sellerId !== uid) {
      return res.status(403).json({ error: 'You are not a participant in this order' });
    }

    if (order.status === 'pending_payment' && order.zetupayPaymentKey) {
      order = await reconcileWithProvider(orderId, order);
    } else {
      lastProviderCheck.delete(orderId);
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
