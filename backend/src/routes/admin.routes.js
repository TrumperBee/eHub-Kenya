// Admin-only order administration.
//
// Orders are written exclusively by the backend (see firestore.rules), so the
// two actions the admin console needs are exposed here instead of letting the
// browser mutate the order document:
//
//   POST /api/admin/orders/:orderId/payout-paid   — record a manual seller payout
//   POST /api/admin/orders/:orderId/under-review  — move a dispute to review
//   POST /api/admin/run-overdue-check             — force a seller overdue sweep
//
// SECURITY: every handler re-checks the caller's verified token email against
// ADMIN_EMAIL. Route-level gating is not enough on its own because a valid
// Firebase token only proves identity, not privilege.

const express = require('express');
const router = express.Router();
const { admin, adminDb } = require('../services/firebaseAdmin');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { runOverdueSellerCheck } = require('../services/sellerOverdueSweep');
const { approveSellerApplication, VALID_SELLER_UID } = require('../services/sellerApproval');
const { sendSellerApprovedEmail, sendSellerPayoutSentEmail } = require('../services/emailService');
const { notifySellerPayoutSent } = require('../services/payoutNotification');
const { sellerPayout } = require('../utils/payouts');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim();

function isAdmin(req) {
  if (!req.user || !req.user.email) return false;
  // If ADMIN_EMAIL is unset there is no admin identity to compare against, so
  // fail closed rather than treating every signed-in user as an admin.
  if (!ADMIN_EMAIL) return false;
  return req.user.email === ADMIN_EMAIL;
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  return next();
}

const orderRef = (orderId) => adminDb.collection('orders').doc(orderId);

async function loadOrder(orderId) {
  const snap = await orderRef(orderId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * POST /api/admin/orders/:orderId/payout-paid
 * Marks the seller payout for a completed order as paid. Idempotent: a second
 * call is rejected so the payout timestamp cannot be rewritten. After the
 * write, the seller gets an email + in-app notice with the M-Pesa last four.
 */
router.post('/orders/:orderId/payout-paid', verifyFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await loadOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (order.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Only completed orders can be marked as paid out',
      });
    }
    if (order.sellerPaid === true) {
      return res.status(409).json({ success: false, error: 'Payout already recorded' });
    }

    await orderRef(orderId).update({
      sellerPaid: true,
      sellerPaidAt: admin.firestore.FieldValue.serverTimestamp(),
      sellerPaidBy: req.user.uid,
      sellerPaidByEmail: req.user.email || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // The payout is saved. Everything below is best-effort so a delivery
    // problem cannot make an already-sent payout look like it failed.
    try {
      const sellerId = order.sellerId;
      if (sellerId) {
        const [publicResult, privateResult] = await Promise.allSettled([
          adminDb.doc(`users/${sellerId}`).get(),
          adminDb.doc(`users/${sellerId}/private/contact`).get(),
        ]);
        const publicSnap = publicResult.status === 'fulfilled' ? publicResult.value : null;
        const privateSnap = privateResult.status === 'fulfilled' ? privateResult.value : null;
        const profile = publicSnap?.exists ? publicSnap.data() : {};
        const contact = privateSnap?.exists ? privateSnap.data() : {};
        const phoneNumber =
          contact.phoneNumber || contact.whatsappNumber ||
          profile.phoneNumber || profile.sellerWhatsapp ||
          order.sellerPhone || '';

        await notifySellerPayoutSent({
          uid: sellerId,
          orderId,
          amount: sellerPayout(order.amount),
          phoneNumber,
          sellerName:
            profile.displayName || profile.sellerDisplayName ||
            order.sellerDisplayName || profile.username || '',
          listingTitle: order.listingTitle || '',
          sendEmail: sendSellerPayoutSentEmail,
          createNotification: async ({ userId, title, message, type, orderId: relatedOrderId }) => {
            await adminDb.collection('notifications').add({
              userId,
              title,
              message,
              type,
              orderId: relatedOrderId || null,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          },
        });
      }
    } catch (notifyErr) {
      console.error(`Payout notice failed for order ${orderId}:`, notifyErr);
    }

    return res.json({ success: true, orderId });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/admin/orders/:orderId/under-review
 * Records that the admin has picked up a disputed order.
 */
router.post(
  '/orders/:orderId/under-review',
  verifyFirebaseToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const order = await loadOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      if (order.status !== 'disputed' && order.disputeStatus !== 'open') {
        return res.status(400).json({
          success: false,
          error: 'Order is not an open dispute',
        });
      }

      await orderRef(orderId).update({
        disputeStatus: 'under_review',
        adminReviewRequired: false,
        disputeUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        adminReviewerId: req.user.uid,
        adminReviewerName: req.user.name || req.user.email || 'Admin',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({ success: true, orderId });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/run-overdue-check
 * Runs the seller overdue-credential sweep immediately (5h reminder, 24h flag,
 * auto-suspend at 3 warnings). The same pass runs at boot and hourly; this
 * route lets an admin verify or force it without waiting for the interval.
 */
router.post('/run-overdue-check', verifyFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await runOverdueSellerCheck();
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/admin/sellers/:uid/approve
 * Persists a seller approval in both Firestore documents, then sends the
 * welcome email. The email is idempotent per uid, so re-approving a seller
 * never sends a second welcome message.
 */
router.post('/sellers/:uid/approve', verifyFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { uid } = req.params;
    if (!VALID_SELLER_UID.test(uid)) {
      return res.status(400).json({ success: false, error: 'Invalid seller id' });
    }

    const userRef = adminDb.doc(`users/${uid}`);
    const applicationRef = adminDb.doc(`sellerApplications/${uid}`);
    const [userSnap, applicationSnap] = await Promise.all([userRef.get(), applicationRef.get()]);
    if (!userSnap.exists) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    if (!applicationSnap.exists) {
      return res.status(404).json({ success: false, error: 'Seller application not found' });
    }

    const result = await approveSellerApplication({
      uid,
      adminUid: req.user.uid,
      sellerName: userSnap.data().displayName || '',
      userRef,
      applicationRef,
      sendWelcome: sendSellerApprovedEmail,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
