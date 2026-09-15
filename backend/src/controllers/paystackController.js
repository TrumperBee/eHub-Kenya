const { verifyTransaction, generateReference } = require('../services/paystackService');
const { admin, adminDb } = require('../services/firebaseAdmin');
const { getEATDateString } = require('../utils/fridayDropScheduler');
const { FRONTEND_URL } = require('../config');
const {
  sendBuyerPaymentConfirmedEmail,
  sendSellerPaymentReceivedEmail,
} = require('../services/emailService');
const { reconcileAsync } = require('../services/statsRecoService');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ochiengv250@gmail.com';

// Statuses that mean the payment has already been successfully processed.
// Shared by the callback, webhook and on-demand verify paths so every entry
// point agrees on idempotency.
const PROCESSED_STATUSES = [
  'payment_confirmed',
  'in_transfer',
  'awaiting_seller_delivery',
  'credentials_submitted',
  'completed',
];

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
    console.error('Notification error:', err);
  }
}

async function getAdminUserId() {
  try {
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    return user.uid || null;
  } catch {
    return null;
  }
}

/**
 * Atomic purchase lock. The listing is flipped to 'reserved' inside the same
 * transaction that creates the order, so two buyers can never both complete a
 * purchase for the same listing. A reserved listing is excluded from Browse,
 * search, home, Friday Drops and favourites on the client.
 */
async function initializePayment(req, res) {
  try {
    const { listingId, buyerEmail, amount } = req.body;
    const buyerId = req.user.uid;

    if (!listingId || !buyerEmail || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

const listingRef = adminDb.doc(`listings/${listingId}`);
const orderRef = adminDb.collection('orders').doc();
const orderId = orderRef.id;
const reference = generateReference(orderId);

/**
 * A live Friday Drop (approved, bound to today's EAT date) overrides the price
 * the marketplace display shows and therefore the price the buyer pays. Resolve
 * it from the backend so amount validation and the stored order amount match
 * what the buyer saw. Non-fatal: if no live drop is found, listing.price is used.
 */
async function resolveEffectivePrice(listingId) {
  const todayEAT = getEATDateString(new Date());
  try {
    const dropSnap = await adminDb.collection('fridayDrops')
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

let orderCreated = false;

try {
  await adminDb.runTransaction(async (tx) => {
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists) {
      throw new Error('LISTING_NOT_FOUND');
    }

    const listing = listingSnap.data();
    if (listing.status !== 'active') {
      throw new Error('LISTING_UNAVAILABLE');
    }

    const dropPrice = await resolveEffectivePrice(listingId);
    const chargeablePrice = dropPrice != null ? dropPrice : listing.price;

    if (Math.abs(chargeablePrice - amount) > 1) {
      throw new Error('AMOUNT_MISMATCH');
    }

    if (listing.sellerId === buyerId) {
      throw new Error('OWN_LISTING');
    }

    tx.set(orderRef, {
      id: orderId,
      buyerId,
      buyerEmail,
      buyerDisplayName: req.user.name || req.user.email || 'Buyer',
      sellerId: listing.sellerId,
      sellerDisplayName: listing.sellerDisplayName || 'Seller',
      listingId,
      listingTitle: listing.title,
      listingTier: listing.tier,
      amount: chargeablePrice,
      paymentProvider: 'paystack',
      paymentReference: reference,
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
          reservedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        orderCreated = true;
      });
    } catch (err) {
      const code = err.message;
      const statusMap = {
        LISTING_NOT_FOUND: [404, 'Listing not found'],
        LISTING_UNAVAILABLE: [400, 'This account is no longer available'],
        AMOUNT_MISMATCH: [400, 'Amount mismatch. Please refresh and try again.'],
        OWN_LISTING: [400, 'You cannot buy your own listing'],
      };
      const [status, message] = statusMap[code] || [500, 'Payment initialization failed. Try again.'];
      return res.status(status).json({ error: message });
    }

    // Note: the Paystack transaction itself is initialized by the react-paystack
    // popup in the browser using this same reference. Initializing here would
    // cause a "Duplicate Transaction Reference" error when the popup runs.
    if (orderCreated) reconcileAsync(); // listing reserve changed (available--)
    res.json({
      success: true,
      reference,
      orderId,
    });
  } catch (err) {
    console.error('Payment init error:', err);
    res.status(500).json({ error: 'Payment initialization failed. Try again.' });
  }
}

/**
 * Releases a listing reservation back to 'active'. Only releases when the
 * listing is still reserved by the same buyer, so a fresh order can never be
 * clobbered by an old cancelled one.
 */
async function releaseListingReservation(orderId, listingId, buyerId) {
  const listingRef = adminDb.doc(`listings/${listingId}`);
  const listingSnap = await listingRef.get();
  if (!listingSnap.exists) return;

  const listing = listingSnap.data();
  if (listing.status === 'reserved' && listing.reservedById === buyerId) {
    await listingRef.update({
      status: 'active',
      reservedById: admin.firestore.FieldValue.delete(),
      reservedAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function cancelPendingOrder(orderId) {
  const orderRef = adminDb.doc(`orders/${orderId}`);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return false;

  const order = orderSnap.data();
  if (order.status !== 'pending_payment') return false;

  await orderRef.update({
    status: 'cancelled',
    paymentStatus: 'abandoned',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (order.listingId && order.buyerId) {
    await releaseListingReservation(orderId, order.listingId, order.buyerId);
    reconcileAsync(); // listing may have returned to 'active'
  }

  return true;
}

/**
 * POST /api/payment/cancel — called when the buyer closes the Paystack popup
 * without paying. Cancels the pending order and frees the listing.
 */
async function cancelPayment(req, res) {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const orderSnap = await adminDb.doc(`orders/${orderId}`).get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderSnap.data();
    if (order.buyerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only the buyer can cancel this order' });
    }

    await cancelPendingOrder(orderId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Payment cancel error:', err);
    return res.status(500).json({ error: 'Failed to cancel payment' });
  }
}

/**
 * GET /api/payment/paystack/cancel?reference=... — Paystack's cancel_action.
 * Frees the reservation if the buyer abandoned payment, then redirects to the
 * "payment not completed" page.
 */
async function handlePaystackCancel(req, res) {
  try {
    const reference = req.query.reference;
    if (reference) {
      const orderSnap = await adminDb.collection('orders')
        .where('paymentReference', '==', reference).limit(1).get();
      if (!orderSnap.empty) {
        await cancelPendingOrder(orderSnap.docs[0].id);
      }
    }
    return res.redirect(`${FRONTEND_URL}/payment-failed`);
  } catch (err) {
    console.error('Paystack cancel error:', err);
    return res.redirect(`${FRONTEND_URL}/payment-failed`);
  }
}

async function processSuccessfulPayment(reference) {
  const transaction = await verifyTransaction(reference);

  if (!transaction || transaction.status !== 'success') return null;

  // Find the order by its Paystack reference (authoritative, independent of popup metadata)
  const orderSnap = await adminDb.collection('orders')
    .where('paymentReference', '==', reference).limit(1).get();
  if (orderSnap.empty) return null;

  const orderRef = orderSnap.docs[0].ref;
  const orderId = orderSnap.docs[0].id;

  // Atomic idempotent confirmation. Paystack fires the callback redirect AND the
  // charge.success webhook for the same payment (and may retry either). The
  // read-then-write guard lives inside a Firestore transaction so exactly one
  // caller can move pending_payment -> paid; every other caller no-ops.
  let state = null;
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return;

    const current = snap.data();
    if (PROCESSED_STATUSES.includes(current.status)) return;
    if (current.status !== 'pending_payment') return;

    tx.update(orderRef, {
      status: 'awaiting_seller_delivery',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      paymentTransactionId: transaction.id ? transaction.id.toString() : null,
      paymentChannel: transaction.channel || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    state = {
      ...current,
      id: orderId,
      status: 'awaiting_seller_delivery',
      paymentStatus: 'paid',
      escrowStatus: 'held',
      paymentChannel: transaction.channel || null,
    };
  });

  // Already confirmed (or cancelled/refunded) — nothing more to do.
  if (!state) return { orderId, reference };

  // The listing is already 'reserved' from the atomic purchase lock; keep it
  // reserved (excluded from the marketplace) until the buyer confirms receipt.
  if (state.listingId) {
    await adminDb.doc(`listings/${state.listingId}`).update({
      status: 'reserved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch((err) => console.error('Payment: keep listing reserved failed:', err));
  }

  // Side effects run in the background and are individually failure-isolated.
  // The order is already confirmed by the transaction above, so a slow email
  // or a failed chat write must never block the webhook ack or callback redirect.
  runPaymentSideEffects(state, transaction, orderId);

  return { orderId, reference };
}

function runPaymentSideEffects(order, transaction, orderId) {
  const run = async () => {
    // Payment verified — recompute the derived counters from source-of-truth.
    await reconcileAsync();

    const messagesRef = adminDb.collection(`orders/${orderId}/messages`);
    await messagesRef.add({
      senderId: 'system',
      senderDisplayName: 'eFootball Hub Kenya',
      senderRole: 'system',
      content: `Payment of KES ${(transaction.amount / 100).toLocaleString()} confirmed via ${transaction.channel || 'Paystack'}. The order chat is now open. Seller: submit the buyer's eFootball account login details from the order page. Buyer: once the seller submits the account details, verify the login and confirm delivery.`,
      messageType: 'system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (order.buyerId) {
      await createNotification({
        userId: order.buyerId,
        title: 'Payment Confirmed!',
        message: `Your payment for "${order.listingTitle || 'the listing'}" was successful. The seller has been notified to submit the account details.`,
        type: 'payment',
        orderId,
      });
    }

    if (order.sellerId) {
      await createNotification({
        userId: order.sellerId,
        title: 'New Paid Order',
        message: `The buyer paid for "${order.listingTitle || 'your listing'}". Submit the account login details from the order page now.`,
        type: 'order',
        orderId,
      });
    }

    // Trusted event: Paystack verified the charge. Never blocks the purchase —
    // if an email fails, the order itself is unaffected.
    const emailOrder = { ...order, paymentChannel: transaction.channel || null };
    await sendBuyerPaymentConfirmedEmail(emailOrder);
    await sendSellerPaymentReceivedEmail(emailOrder);
  };

  run().catch((err) => console.error('Payment side-effects error:', err));
}

/**
 * POST /api/payment/verify — on-demand re-check used by the order page. If the
 * callback/webhook never ran (or ran before Paystack marked the charge
 * successful), the buyer can trigger verification here. Reuses the exact same
 * idempotent processSuccessfulPayment path as the callback and webhook.
 */
async function verifyPayment(req, res) {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const orderRef = adminDb.doc(`orders/${orderId}`);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderSnap.data();
    const isParticipant =
      order.buyerId === req.user.uid || order.sellerId === req.user.uid;
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this order' });
    }

    // Already paid — nothing to re-verify.
    if (order.paymentStatus === 'paid' || PROCESSED_STATUSES.includes(order.status)) {
      return res.json({
        success: true,
        status: order.status,
        paymentStatus: 'paid',
        escrowStatus: order.escrowStatus || 'held',
      });
    }

    // Not waiting on a Paystack charge — nothing to verify.
    if (order.status !== 'pending_payment' || !order.paymentReference) {
      return res.json({
        success: true,
        status: order.status,
        paymentStatus: order.paymentStatus || 'pending',
      });
    }

    const result = await processSuccessfulPayment(order.paymentReference);

    if (!result || !result.orderId) {
      // Verify said the charge is not successful yet (or no order matched).
      return res.json({
        success: true,
        status: order.status,
        paymentStatus: order.paymentStatus || 'pending',
      });
    }

    const afterSnap = await orderRef.get();
    const after = afterSnap.data();
    return res.json({
      success: true,
      status: after.status,
      paymentStatus: after.paymentStatus || 'pending',
      escrowStatus: after.escrowStatus || 'none',
    });
  } catch (err) {
    console.error('Payment verify error:', err);
    return res.status(500).json({ error: 'Could not verify the payment. Please try again.' });
  }
}

async function handleCallback(req, res) {
  try {
    const reference = req.query.reference;
    if (!reference) return res.status(400).send('No reference');

    const result = await processSuccessfulPayment(reference);

    if (result && result.orderId) {
      return res.redirect(`${FRONTEND_URL}/orders/${result.orderId}?payment=success`);
    }

    const orderSnap = await adminDb.collection('orders')
      .where('paymentReference', '==', reference).limit(1).get();
    if (!orderSnap.empty) {
      await cancelPendingOrder(orderSnap.docs[0].id);
      return res.redirect(`${FRONTEND_URL}/payment-failed?ref=${reference}`);
    }
    return res.redirect(`${FRONTEND_URL}/payment-failed`);
  } catch (err) {
    console.error('Paystack callback error:', err);
    return res.redirect(`${FRONTEND_URL}/payment-failed`);
  }
}

async function handleWebhook(req, res) {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;
  if (event === 'charge.success') {
    try {
      // Await processing before acknowledging. If the transition or Paystack
      // API call fails, we return 500 so Paystack retries the webhook. The
      // callback redirect and the on-demand verify endpoint remain covered by
      // the same idempotent transaction, so a retry can never double-process.
      await processSuccessfulPayment(data.reference);
    } catch (e) {
      console.error('Webhook processing error:', e);
      return res.status(500).send('Processing failed');
    }
  }
  return res.sendStatus(200);
}

module.exports = {
  initializePayment,
  cancelPayment,
  verifyPayment,
  handleCallback,
  handleWebhook,
  handlePaystackCancel,
};