// Cross-user notifications.
//
// POST /api/notifications — create a notification for ANOTHER user (mentions,
// replies, admin announcements). Creating one for yourself still works, but the
// Firestore rules already allow that path without an API round-trip; this
// endpoint exists so one user can never write into another user's feed directly.
//
// SECURITY: the recipient is verified to exist, the title/message are trimmed,
// control characters stripped and length-capped, and the optional link is
// restricted to an in-app relative path so a notification can never be used to
// bounce a user to an external (phishing) origin.

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { admin, adminDb } = require('../services/firebaseAdmin');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { LIMITS, cleanText } = require('../utils/validateInput');

// A human cannot legitimately mention/reply to 20 different people per hour
// from one account; this stops the endpoint from being a spam amplifier.
const notifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.uid || rateLimit.ipKeyGenerator(req.ip),
  message: { error: 'Too many notifications sent. Please try again later.' },
});

const ALLOWED_TYPES = new Set([
  'mention',
  'reply',
  'comment',
  'order',
  'listing',
  'drop',
  'system',
  'announcement',
]);

/**
 * Only in-app relative paths are accepted. Absolute URLs, protocol-relative
 * URLs (//evil.com) and scheme handlers (javascript:) are rejected.
 */
function safeLink(value) {
  if (typeof value !== 'string') return null;
  const link = value.trim();
  if (!link.startsWith('/') || link.startsWith('//')) return null;
  if (link.length > 300) return null;
  if (/[\u0000-\u001F\u007F]/.test(link)) return null;
  return link;
}

router.post('/', verifyFirebaseToken, notifyLimiter, async (req, res, next) => {
  try {
    const { userId, title, message, type, listingId, link } = req.body || {};

    if (typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const recipientId = userId.trim();
    const cleanTitle = cleanText(title, LIMITS.notificationTitle);
    const cleanMessage = cleanText(message, LIMITS.notificationMessage);

    if (!cleanTitle || !cleanMessage) {
      return res.status(400).json({ error: 'title and message are required' });
    }

    const notificationType = ALLOWED_TYPES.has(type) ? type : 'system';
    const cleanListingId =
      typeof listingId === 'string' && listingId.trim() ? cleanText(listingId, 128) : null;

    // SECURITY: never create a notification for a uid that does not exist.
    const recipient = await adminDb.doc(`users/${recipientId}`).get();
    if (!recipient.exists) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const ref = await adminDb.collection('notifications').add({
      userId: recipientId,
      title: cleanTitle,
      message: cleanMessage,
      type: notificationType,
      listingId: cleanListingId,
      link: safeLink(link),
      actorId: req.user.uid,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ success: true, id: ref.id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
