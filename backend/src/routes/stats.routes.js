const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { reconcilePlatformStats } = require('../services/statsRecoService');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ochiengv250@gmail.com';

/**
 * POST /api/stats/reconcile — admin-only. Recomputes the homepage platform
 * statistics from source-of-truth data (listings/orders/users) and rewrites
 * stats/global. Never exposed publicly; the public homepage only reads the
 * aggregate doc through its real-time subscription.
 */
router.post('/reconcile', verifyFirebaseToken, async (req, res) => {
  try {
    if (!req.user.email || req.user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const stats = await reconcilePlatformStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('Stats reconcile error:', err);
    return res.status(500).json({ error: 'Failed to reconcile stats' });
  }
});

module.exports = router;