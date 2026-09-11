const { verifyTransaction, generateReference } = require('../services/paystackService');
const { admin, adminDb } = require('../services/firebaseAdmin');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ochiengv250@gmail.com';

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

        if (Math.abs(listing.price - amount) > 1) {
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
          amount: listing.price,
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
        LISTING_UNAVAILABLE: [400, 'This listing is no longer available'],
        AMOUNT_MISMATCH: [400, 'Amount mismatch. Please refresh and try again.'],
        OWN_LISTING: [400, 'You cannot buy your own listing'],
      };
      const [status, message] = statusMap[code] || [500, 'Payment initialization failed. Try again.'];
      return res.status(status).json({ error: message });
    }

    // Note: the Paystack transaction itself is initialized by the react-paystack
    // popup in the browser using this same reference. Initializing here would
    // cause a "Duplicate Transaction Reference" error when the popup runs.
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
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
  } catch (err) {
    console.error('Paystack cancel error:', err);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
  }
}

async function processSuccessfulPayment(reference) {
  const transaction = await verifyTransaction(reference);

  if (transaction.status !== 'success') return null;

  // Find the order by its Paystack reference (authoritative, independent of popup metadata)
  const orderSnap = await adminDb.collection('orders')
    .where('paymentReference', '==', reference).limit(1).get();
  if (orderSnap.empty) return null;

  const orderRef = orderSnap.docs[0].ref;
  const orderId = orderSnap.docs[0].id;
  const current = orderSnap.docs[0].data();

  // Idempotency guard: Paystack may call both the webhook and the callback redirect.
  // Only process the first time so stats, chat messages, and notifications are not duplicated.
  const processedStatuses = [
    'payment_confirmed',
    'in_transfer',
    'awaiting_seller_delivery',
    'credentials_submitted',
    'completed',
  ];
  if (processedStatuses.includes(current.status)) {
    return { orderId, reference };
  }

  const { listingId } = transaction.metadata || {};
  const effectiveListingId = listingId || current.listingId;
  const sellerId = current.sellerId;
  const buyerId = current.buyerId;

  await orderRef.update({
    status: 'awaiting_seller_delivery',
    paymentStatus: 'paid',
    escrowStatus: 'held',
    paymentTransactionId: transaction.id ? transaction.id.toString() : null,
    paymentChannel: transaction.channel || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // The listing is already 'reserved' from the atomic purchase lock; keep it
  // reserved (excluded from the marketplace) until the buyer confirms receipt.
  if (effectiveListingId) {
    await adminDb.doc(`listings/${effectiveListingId}`).update({
      status: 'reserved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await adminDb.doc('stats/global').update({
    transactionsProcessed: admin.firestore.FieldValue.increment(1),
  });

  const messagesRef = adminDb.collection(`orders/${orderId}/messages`);
  await messagesRef.add({
    senderId: 'system',
    senderDisplayName: 'eFootball Hub Kenya',
    senderRole: 'system',
    content: `Payment of KES ${(transaction.amount / 100).toLocaleString()} confirmed via ${transaction.channel || 'Paystack'}. The order chat is now open. Seller: submit the buyer's eFootball account login details from the order page. Buyer: once the seller submits the account details, verify the login and confirm delivery.`,
    messageType: 'system',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (buyerId) {
    await createNotification({
      userId: buyerId,
      title: 'Payment Confirmed!',
      message: `Your payment for "${current.listingTitle || 'the listing'}" was successful. The seller has been notified to submit the account details.`,
      type: 'payment',
      orderId,
    });
  }

  if (sellerId) {
    await createNotification({
      userId: sellerId,
      title: 'New Paid Order',
      message: `The buyer paid for "${current.listingTitle || 'your listing'}". Submit the account login details from the order page now.`,
      type: 'order',
      orderId,
    });
  }

  return { orderId, reference };
}

async function handleCallback(req, res) {
  try {
    const reference = req.query.reference;
    if (!reference) return res.status(400).send('No reference');

    const result = await processSuccessfulPayment(reference);

    if (result && result.orderId) {
      return res.redirect(`${process.env.FRONTEND_URL}/orders/${result.orderId}?payment=success`);
    }

    const orderSnap = await adminDb.collection('orders')
      .where('paymentReference', '==', reference).limit(1).get();
    if (!orderSnap.empty) {
      await cancelPendingOrder(orderSnap.docs[0].id);
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failed?ref=${reference}`);
    }
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
  } catch (err) {
    console.error('Paystack callback error:', err);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
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

  res.sendStatus(200);

  const { event, data } = req.body;
  if (event === 'charge.success') {
    try {
      await processSuccessfulPayment(data.reference);
    } catch (e) {
      console.error('Webhook processing error:', e);
    }
  }
}

module.exports = {
  initializePayment,
  cancelPayment,
  handleCallback,
  handleWebhook,
  handlePaystackCancel,
};