// Web Push subscription management.
//
// POST   /api/push/subscribe — store the browser PushSubscription for the
//                              signed-in user (one document per endpoint).
// DELETE /api/push/subscribe — remove it when the user unsubscribes or the
//                              browser drops the subscription.
//
// Documents are keyed by a SHA-256 hash of the endpoint so the endpoint itself
// never appears as a Firestore document id (endpoints are long and contain
// characters that are awkward as ids).

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { admin, adminDb } = require('../services/firebaseAdmin');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');

const MAX_ENDPOINT_LENGTH = 2048;

const endpointHash = (endpoint) =>
  crypto.createHash('sha256').update(String(endpoint)).digest('hex');

const collectionFor = (uid) => adminDb.collection('users').doc(uid).collection('pushSubscriptions');

/** Accept only a well-formed browser PushSubscription. */
function normalizeSubscription(body) {
  const raw = body && body.subscription;
  if (!raw || typeof raw !== 'object') return null;

  const endpoint = typeof raw.endpoint === 'string' ? raw.endpoint.trim() : '';
  const p256dh = raw.keys && typeof raw.keys.p256dh === 'string' ? raw.keys.p256dh : '';
  const auth = raw.keys && typeof raw.keys.auth === 'string' ? raw.keys.auth : '';

  if (!endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) return null;
  if (!/^https:\/\//i.test(endpoint)) return null;
  if (!p256dh || !auth) return null;

  return {
    endpoint,
    expirationTime: raw.expirationTime ?? null,
    keys: { p256dh, auth },
  };
}

// POST /api/push/subscribe
router.post('/subscribe', verifyFirebaseToken, async (req, res) => {
  const subscription = normalizeSubscription(req.body);
  if (!subscription) {
    return res.status(400).json({ error: 'A valid push subscription (endpoint + keys) is required' });
  }

  const uid = req.user.uid;
  const id = endpointHash(subscription.endpoint);

  try {
    const ref = collectionFor(uid).doc(id);
    const existing = await ref.get();

    await ref.set(
      {
        subscription,
        endpoint: subscription.endpoint,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 400),
        // Keep the original registration time so we can tell old devices apart.
        createdAt: existing.exists
          ? existing.data().createdAt || admin.firestore.FieldValue.serverTimestamp()
          : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({ success: true, id, updated: existing.exists });
  } catch (err) {
    console.error('Push subscribe error:', err.message);
    return res.status(500).json({ error: 'Could not save the push subscription' });
  }
});

// DELETE /api/push/subscribe
router.delete('/subscribe', verifyFirebaseToken, async (req, res) => {
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : '';
  if (!endpoint) {
    return res.status(400).json({ error: 'endpoint is required' });
  }

  const uid = req.user.uid;
  const id = endpointHash(endpoint);

  try {
    const ref = collectionFor(uid).doc(id);
    const snap = await ref.get();
    if (snap.exists) await ref.delete();
    // Idempotent: deleting a subscription that is already gone is a success.
    return res.json({ success: true, removed: snap.exists });
  } catch (err) {
    console.error('Push unsubscribe error:', err.message);
    return res.status(500).json({ error: 'Could not remove the push subscription' });
  }
});

module.exports = router;
