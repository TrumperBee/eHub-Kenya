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
 * call is rejected so the payout timestamp cannot be rewritten.
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

module.exports = router;
