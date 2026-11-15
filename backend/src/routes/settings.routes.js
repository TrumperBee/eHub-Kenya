// Super-admin platform settings.
//
// POST /api/settings/maintenance — turn the storefront maintenance page on or
// off. The flag is stored at settings/maintenanceMode and is read live by the
// frontend (onSnapshot), so a change takes effect for every open tab at once.

const express = require('express');
const router = express.Router();
const { admin, adminDb } = require('../services/firebaseAdmin');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ochiengv250@gmail.com';
const MAINTENANCE_DOC = 'settings/maintenanceMode';
const MAX_MESSAGE_LENGTH = 500;

function isSuperAdmin(req) {
  return Boolean(req.user && req.user.email && req.user.email === ADMIN_EMAIL);
}

// GET /api/settings/maintenance — public read of the current flag (the frontend
// reads Firestore directly, this is for ops checks and server-side callers).
router.get('/maintenance', async (req, res) => {
  try {
    const snap = await adminDb.doc(MAINTENANCE_DOC).get();
    const data = snap.exists ? snap.data() : {};
    res.json({
      enabled: data.enabled === true,
      message: typeof data.message === 'string' ? data.message : '',
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
    });
  } catch (err) {
    console.error('Maintenance status read error:', err);
    res.status(500).json({ error: 'Could not read maintenance settings' });
  }
});

// POST /api/settings/maintenance — super admin only.
router.post('/maintenance', verifyFirebaseToken, async (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  const { enabled } = req.body || {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be true or false' });
  }

  const message = String((req.body && req.body.message) || '').trim().slice(0, MAX_MESSAGE_LENGTH);

  try {
    await adminDb.doc(MAINTENANCE_DOC).set(
      {
        enabled,
        message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`[settings] maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'} by ${req.user.email}`);
    return res.json({ success: true, maintenanceMode: { enabled, message } });
  } catch (err) {
    console.error('Maintenance mode update error:', err);
    return res.status(500).json({ error: 'Could not update maintenance mode' });
  }
});

module.exports = router;
