const { verifyTransaction, generateReference } = require('../services/paystackService');
const { admin, adminDb } = require('../services/firebaseAdmin');

async function createNotification({ userId, title, message, type, orderId }) {
  try {
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

async function initializePayment(req, res) {
  try {
    const { listingId, buyerEmail, amount } = req.body;
    const buyerId = req.user.uid;

    if (!listingId || !buyerEmail || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const listingDoc = await adminDb.doc(`listings/${listingId}`).get();
    if (!listingDoc.exists) return res.status(404).json({ error: 'Listing not found' });

    const listing = listingDoc.data();
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'This listing is no longer available' });
    }

    if (Math.abs(listing.price - amount) > 1) {
      return res.status(400).json({ error: 'Amount mismatch. Please refresh and try again.' });
    }

    if (listing.sellerId === buyerId) {
      return res.status(400).json({ error: 'You cannot buy your own listing' });
    }

    const orderRef = adminDb.collection('orders').doc();
    const orderId = orderRef.id;
    const reference = generateReference(orderId);

    await orderRef.set({
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
      paystackReference: reference,
      status: 'pending_payment',
      escrowStatus: 'none',
      buyerConfirmedReceipt: false,
      disputeReason: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

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

async function processSuccessfulPayment(reference) {
  const transaction = await verifyTransaction(reference);

  if (transaction.status !== 'success') return null;

  // Find the order by its Paystack reference (authoritative, independent of popup metadata)
  const orderSnap = await adminDb.collection('orders')
    .where('paystackReference', '==', reference).limit(1).get();
  if (orderSnap.empty) return null;

  const orderRef = orderSnap.docs[0].ref;
  const orderId = orderSnap.docs[0].id;
  const current = orderSnap.docs[0].data();

  // Idempotency guard: Paystack may call both the webhook and the callback redirect.
  // Only process the first time so stats, chat messages, and notifications are not duplicated.
  if (['payment_confirmed', 'in_transfer', 'completed'].includes(current.status)) {
    return { orderId, reference };
  }

  const { listingId } = transaction.metadata || {};
  const effectiveListingId = listingId || current.listingId;
  const sellerId = current.sellerId;
  const buyerId = current.buyerId;

  await orderRef.update({
    status: 'payment_confirmed',
    escrowStatus: 'held',
    paystackTransactionId: transaction.id ? transaction.id.toString() : null,
    paystackChannel: transaction.channel || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (effectiveListingId) {
    await adminDb.doc(`listings/${effectiveListingId}`).update({
      status: 'sold',
      soldAt: admin.firestore.FieldValue.serverTimestamp(),
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
    content: `Payment of KES ${(transaction.amount / 100).toLocaleString()} confirmed via ${transaction.channel || 'Paystack'}. The order chat is now open. Seller: please ask the buyer for their email to begin the account transfer.`,
    messageType: 'system',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (buyerId) {
    await createNotification({
      userId: buyerId,
      title: 'Payment Confirmed!',
      message: `Your payment for the listing was successful. Open your order to start the transfer.`,
      type: 'payment',
      orderId,
    });
  }

  if (sellerId) {
    await createNotification({
      userId: sellerId,
      title: 'New Sale!',
      message: `Someone just purchased your listing. Open the order chat to begin the transfer.`,
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
      .where('paystackReference', '==', reference).limit(1).get();
    if (!orderSnap.empty) {
      const orderId = orderSnap.docs[0].id;
      await adminDb.doc(`orders/${orderId}`).update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
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

module.exports = { initializePayment, handleCallback, handleWebhook };
