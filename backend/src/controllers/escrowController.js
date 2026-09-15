const { admin, adminDb } = require('../services/firebaseAdmin');
const {
  sendSellerCredentialsSubmittedEmail,
  sendBuyerCredentialsReadyEmail,
  sendOrderCompletedEmail,
  sendOrderRefundedEmail,
  sendDisputeRaisedEmail,
  sendDisputeResolvedEmail,
} = require('../services/emailService');

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

    await adminDb.doc('stats/global').set({
      totalSalesCompleted: admin.firestore.FieldValue.increment(1),
    }, { merge: true });

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

    // Trusted event: escrow released by the buyer. Never blocks the workflow.
    await sendOrderCompletedEmail(order);

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

    // Trusted event: dispute opened. Never blocks the workflow.
    await sendDisputeRaisedEmail({ ...order, id: orderId, disputeReason: reason });

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

    // Trusted event: credentials submitted (in-order). Never block on emails.
    await sendSellerCredentialsSubmittedEmail({ ...order, id: orderId });
    await sendBuyerCredentialsReadyEmail({ ...order, id: orderId });

    return res.json({ success: true });
  } catch (err) {
    console.error('Delivery submission error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit account details' });
  }
}

/**
 * POST /api/escrow/resolve — admin-only. Resolves a dispute (or completes a
 * manual admin release/refund for a paid order) FROM THE BACKEND so that the
 * resolution writes, chat message, notifications and emails all happen behind
 * the trusted event — the admin never mutates Firestore directly.
 *
 * The manual payment action itself (Paystack payout/reversal) stays with the
 * admin, exactly as today — this endpoint records the resolution.
 */
const RESOLVABLE_STATUSES = [
  'payment_confirmed',
  'in_transfer',
  'awaiting_seller_delivery',
  'credentials_submitted',
  'disputed',
];

async function resolve(req, res) {
  try {
    const { orderId, resolution } = req.body;
    const actor = req.user;

    if (!orderId || !resolution) {
      return res.status(400).json({ success: false, error: 'orderId and resolution are required' });
    }
    if (resolution !== 'release' && resolution !== 'refund') {
      return res.status(400).json({ success: false, error: 'resolution must be "release" or "refund"' });
    }
    if (!actor.email || actor.email !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderSnap.data();
    const isDisputed = order.status === 'disputed';

    if (!RESOLVABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ success: false, error: 'Order cannot be resolved in its current state' });
    }

    const isRelease = resolution === 'release';
    const resolutionKey = isRelease ? 'released_to_seller' : 'refunded';
    const orderStatus = isRelease ? 'completed' : 'refunded';
    const escrowStatus = isRelease ? 'released' : 'refunded';
    const resolvedAt = new Date().toISOString();

    const patch = {
      status: orderStatus,
      escrowStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (isDisputed) {
      Object.assign(patch, {
        disputeStatus: 'resolved',
        disputeResolution: resolutionKey,
        disputeResolvedAt: resolvedAt,
        disputeResolvedBy: actor.uid || '',
        disputeResolvedByName: actor.name || 'Admin',
        disputeUpdatedAt: resolvedAt,
        adminReviewRequired: false,
        resolvedAt,
        resolvedById: actor.uid || '',
        resolvedByName: actor.name || 'Admin',
      });
    }
    await orderRef.update(patch);

    if (isRelease) {
      if (order.listingId) {
        await adminDb.collection('listings').doc(order.listingId).update({
          status: 'sold',
          reservedById: admin.firestore.FieldValue.delete(),
          reservedAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
      if (order.sellerId) {
        await adminDb.collection('users').doc(order.sellerId).update({
          totalSales: admin.firestore.FieldValue.increment(1),
        }).catch(() => {});
      }
      await adminDb.doc('stats/global').set({
        totalSalesCompleted: admin.firestore.FieldValue.increment(1),
      }, { merge: true }).catch(() => {});
    } else {
      if (order.listingId) {
        await adminDb.collection('listings').doc(order.listingId).update({
          status: 'active',
          reservedById: admin.firestore.FieldValue.delete(),
          reservedAt: admin.firestore.FieldValue.delete(),
          soldAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
    }

    const systemMessage = isDisputed
      ? (isRelease
          ? `Admin resolved the dispute in the seller's favour. Funds released to seller. A manual payout to the seller is pending admin confirmation.`
          : `Admin resolved the dispute in the buyer's favour. Order refunded. A manual refund to the buyer is pending admin confirmation.`)
      : (isRelease
          ? 'Escrow released by admin. Order completed — payout pending.'
          : 'Order refunded by admin. The listing has been re-listed.');

    await orderRef.collection('messages').add({
      senderId: 'system',
      senderDisplayName: 'System',
      senderRole: 'system',
      messageType: 'system',
      content: systemMessage,
      text: systemMessage,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    if (isRelease) {
      await createNotification({
        userId: order.sellerId,
        title: isDisputed ? '✅ Payment Released' : 'Escrow Released',
        message: isDisputed
          ? `The dispute for "${order.listingTitle || 'your listing'}" was resolved in your favour. ${formatAmount(order.amount)} has been released to you. Complete the payout to your registered payout phone.`
          : `Escrow for "${order.listingTitle || 'your listing'}" (${formatAmount(order.amount)}) was released to you. Complete the payout to your registered payout phone.`,
        type: 'payment',
        orderId,
      });
      await createNotification({
        userId: order.buyerId,
        title: isDisputed ? 'Dispute Resolved' : 'Order Completed',
        message: isDisputed
          ? `Your dispute for "${order.listingTitle || ''}" was resolved in the seller's favour. The order is complete.`
          : `Your order "${order.listingTitle || ''}" was completed. Thank you for shopping with eHub Kenya.`,
        type: 'order',
        orderId,
      });
    } else {
      await createNotification({
        userId: order.buyerId,
        title: '✅ Refund Issued',
        message: `Your dispute for "${order.listingTitle || 'your order'}" was resolved in your favour. ${formatAmount(order.amount)} will be refunded back to your payment method.`,
        type: 'payment',
        orderId,
      });
      await createNotification({
        userId: order.sellerId,
        title: 'Order Refunded',
        message: `The order "${order.listingTitle || ''}" was refunded to the buyer. Your listing is now live again.`,
        type: 'order',
        orderId,
      });
    }

    const emailOrder = { ...order, id: orderId };
    if (isDisputed) {
      await sendDisputeResolvedEmail(emailOrder, { toRole: 'seller', resolution });
      await sendDisputeResolvedEmail(emailOrder, { toRole: 'buyer', resolution });
    } else if (isRelease) {
      await sendOrderCompletedEmail(emailOrder);
    } else {
      await sendOrderRefundedEmail(emailOrder);
    }

    return res.json({ success: true, resolutionKey });
  } catch (err) {
    console.error('Escrow resolve error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

function formatAmount(amount) {
  return `KES ${Number(amount || 0).toLocaleString('en-KE')}`;
}

module.exports = { release, dispute, submitDelivery, resolve };