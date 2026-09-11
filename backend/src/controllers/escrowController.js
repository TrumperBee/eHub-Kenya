const { admin, adminDb } = require('../services/firebaseAdmin');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ochiengv250@gmail.com';

const RELEASABLE_STATUSES = [
  'payment_confirmed',
  'in_transfer',
  'awaiting_seller_delivery',
  'credentials_submitted',
];

const DISPUTABLE_STATUSES = [
  'payment_confirmed',
  'in_transfer',
  'awaiting_seller_delivery',
  'credentials_submitted',
];

const DELIVERABLE_STATUSES = [
  'payment_confirmed',
  'in_transfer',
  'awaiting_seller_delivery',
  'credentials_submitted',
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

async function release(req, res) {
  try {
    const { orderId } = req.body;
    const userId = req.user.uid;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderSnap.data();

    if (order.buyerId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the buyer can release escrow' });
    }

    if (!RELEASABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ success: false, error: 'Order is not in a releasable state' });
    }

    await orderRef.update({
      status: 'completed',
      escrowStatus: 'released',
      buyerConfirmedReceipt: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (order.listingId) {
      await adminDb.collection('listings').doc(order.listingId).update({
        status: 'sold',
        reservedById: admin.firestore.FieldValue.delete(),
        reservedAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (order.sellerId) {
      await adminDb.collection('users').doc(order.sellerId).update({
        totalSales: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await adminDb.doc('stats/global').update({
      totalSalesCompleted: admin.firestore.FieldValue.increment(1),
    });

    const messagesRef = orderRef.collection('messages');
    await messagesRef.add({
      senderId: 'system',
      senderDisplayName: 'System',
      senderRole: 'system',
      messageType: 'system',
      content: 'Buyer has confirmed receipt. Transaction complete. Escrow released.',
      text: 'Buyer has confirmed receipt. Transaction complete. Escrow released.',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await createNotification({
      userId: order.sellerId,
      title: 'Payment Released!',
      message: `The buyer confirmed receipt for "${order.listingTitle || 'your listing'}". Your KES ${order.amount} payment has been released.`,
      type: 'payment',
      orderId,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Escrow release error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function dispute(req, res) {
  try {
    const { orderId, reason } = req.body;
    const userId = req.user.uid;

    if (!orderId || !reason) {
      return res.status(400).json({ success: false, error: 'orderId and reason are required' });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderSnap.data();

    if (order.buyerId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the buyer can raise a dispute' });
    }

    if (order.status === 'disputed') {
      return res.status(400).json({ success: false, error: 'A dispute is already open for this order' });
    }

    if (!DISPUTABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ success: false, error: 'Order cannot be disputed in its current state' });
    }

    // First-class dispute state: never leaves escrow status contradictory,
    // and every field that surfaces on the admin dashboard is written atomically.
    await orderRef.update({
      status: 'disputed',
      paymentStatus: order.paymentStatus || 'paid',
      escrowStatus: 'held',
      disputeStatus: 'open',
      disputeReason: reason,
      disputedBy: userId,
      disputedAt: admin.firestore.FieldValue.serverTimestamp(),
      disputeUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      disputeRaisedAt: admin.firestore.FieldValue.serverTimestamp(),
      disputeRaisedBy: userId,
      sellerNotified: true,
      adminReviewRequired: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const shortId = orderId.slice(0, 8).toUpperCase();

    const messagesRef = orderRef.collection('messages');
    await messagesRef.add({
      senderId: 'system',
      senderDisplayName: 'System',
      senderRole: 'system',
      messageType: 'system',
      content: `Buyer has raised a dispute on Order #${shortId}: ${reason}. Escrow is frozen while the admin reviews the case.`,
      text: `Buyer has raised a dispute on Order #${shortId}: ${reason}. Escrow is frozen while the admin reviews the case.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await createNotification({
      userId: order.sellerId,
      title: '⚠️ DISPUTE RAISED',
      message: `A buyer has raised a dispute on Order #${shortId} for "${order.listingTitle || 'your listing'}". Reason: ${reason}. Your payout is currently on hold while the dispute is reviewed.`,
      type: 'alert',
      orderId,
    });

    const adminId = await getAdminUserId();
    await createNotification({
      userId: adminId,
      title: 'New Dispute',
      message: `A buyer raised a dispute on Order #${shortId} for "${order.listingTitle || 'the listing'}". Reason: ${reason}. Open the Command Center → Disputes to review.`,
      type: 'alert',
      orderId,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Escrow dispute error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/escrow/delivery — seller submits the buyer's eFootball account
 * login credentials. Stored in the private orders/{orderId}/delivery
 * subcollection (never in chat messages, URLs, localStorage, or logs).
 */
async function submitDelivery(req, res) {
  try {
    const { orderId, accountEmail, accountPassword } = req.body;
    const userId = req.user.uid;

    if (!orderId || !accountEmail || !accountPassword) {
      return res.status(400).json({ success: false, error: 'orderId, accountEmail and accountPassword are required' });
    }

    const accountEmailStr = String(accountEmail).trim();
    const accountPasswordStr = String(accountPassword);

    if (!accountEmailStr || !accountPasswordStr) {
      return res.status(400).json({ success: false, error: 'Account email and password are required' });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderSnap.data();

    if (order.sellerId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the seller can submit account details' });
    }

    if (!DELIVERABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ success: false, error: 'This order cannot accept account details in its current state' });
    }

    const deliveryRef = orderRef.collection('delivery').doc();
    await deliveryRef.set({
      id: deliveryRef.id,
      accountEmail: accountEmailStr,
      accountPassword: accountPasswordStr,
      submittedById: userId,
      submittedByName: order.sellerDisplayName || 'Seller',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await orderRef.update({
      status: 'credentials_submitted',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const messagesRef = orderRef.collection('messages');
    await messagesRef.add({
      senderId: 'system',
      senderDisplayName: 'eFootball Hub Kenya',
      senderRole: 'system',
      messageType: 'system',
      content: 'Seller has submitted the account login details. Buyer: log in to verify the account, then confirm delivery to release escrow.',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await createNotification({
      userId: order.buyerId,
      title: 'Account Details Received',
      message: `The seller submitted the login details for "${order.listingTitle || 'your purchase'}". Go to your order to view them and confirm delivery.`,
      type: 'order',
      orderId,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Delivery submission error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit account details' });
  }
}

module.exports = { release, dispute, submitDelivery };