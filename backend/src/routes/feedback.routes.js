const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { sendEmail } = require('../services/emailService');
const { adminDb } = require('../services/firebaseAdmin');
const { LIMITS, cleanText } = require('../utils/validateInput');

// Anonymous feedback is allowed, so the limiter is per IP. Three submissions an
// hour is plenty for a human and stops anyone using the form as a mail relay.
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many feedback submissions. Please try again later.' },
});

const FEEDBACK_TO = 'ochiengv250@gmail.com';
const MAX_MESSAGE_LENGTH = LIMITS.feedbackMessage;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Resolve who sent the feedback. The browser only sends a uid, so name,
 * username (gamertag) and email are read from their Firestore profile here —
 * otherwise the alert arrives with no way to reply to the person.
 */
async function resolveSender(userId) {
  if (!userId || userId === 'anonymous') {
    return { uid: 'anonymous', name: '', username: '', email: '' };
  }
  try {
    // SECURITY: email lives in the owner/admin-only contact document now.
    const [snap, contactSnap] = await Promise.all([
      adminDb.doc(`users/${userId}`).get(),
      adminDb.doc(`users/${userId}/private/contact`).get(),
    ]);
    if (!snap.exists) return { uid: userId, name: '', username: '', email: '' };
    const profile = snap.data() || {};
    const contact = contactSnap.exists ? contactSnap.data() : {};
    return {
      uid: userId,
      name: profile.displayName || profile.sellerDisplayName || '',
      username: profile.username || '',
      email: contact.email || profile.email || '',
    };
  } catch (err) {
    console.warn(`feedback: profile lookup failed for ${userId}: ${err.message}`);
    return { uid: userId, name: '', username: '', email: '' };
  }
}

const displayName = (sender) => {
  if (sender.name) return sender.username ? `${sender.name} (@${sender.username})` : sender.name;
  if (sender.username) return `@${sender.username}`;
  return 'Anonymous';
};

router.post('/', feedbackLimiter, async (req, res, next) => {
  try {
    const { message, rating, userId, page } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    // SECURITY: trim, strip control characters and cap the freetext before it
    // reaches the email template. Oversized input is rejected, not truncated,
    // so the sender knows their message did not arrive whole.
    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      });
    }
    const trimmedMessage = cleanText(message, MAX_MESSAGE_LENGTH);

    let normalizedRating = null;
    if (rating !== null && rating !== undefined && rating !== '') {
      const parsed = Number(rating);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
      }
      normalizedRating = parsed;
    }

    const submittedBy =
      typeof userId === 'string' && userId.trim() ? cleanText(userId, 128) : 'anonymous';
    const submittedPage =
      typeof page === 'string' && page.trim() ? cleanText(page, 200) : '/';
    // Server-side timestamp — the browser clock is not trustworthy for audits.
    const timestamp = new Date().toISOString();
    const sender = await resolveSender(submittedBy);

    const subject = normalizedRating
      ? `eHub Market Feedback — ⭐${normalizedRating}/5`
      : 'eHub Market Feedback — New Feedback';

    const htmlBody = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;line-height:1.6">
        <h2 style="margin:0 0 4px">eHub Market Feedback</h2>
        <p style="margin:0 0 16px;color:#6B7280;font-size:13px">
          ${normalizedRating ? `Rating: ⭐ ${normalizedRating}/5` : 'No rating given'}
          &middot; From ${escapeHtml(displayName(sender))}
        </p>
        <div style="background:#F6F7FB;border-left:4px solid #003BFF;padding:12px 16px;white-space:pre-wrap">
          ${escapeHtml(trimmedMessage)}
        </div>
        <table style="margin-top:16px;font-size:13px;color:#374151">
          <tr><td style="padding:2px 12px 2px 0;color:#9CA3AF">From</td><td>${escapeHtml(displayName(sender))}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:#9CA3AF">Username</td><td>${sender.username ? `@${escapeHtml(sender.username)}` : '—'}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:#9CA3AF">Email</td><td>${sender.email ? escapeHtml(sender.email) : '—'}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:#9CA3AF">Rating</td><td>${normalizedRating ? `${normalizedRating}/5` : '—'}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:#9CA3AF">User ID</td><td>${escapeHtml(submittedBy)}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:#9CA3AF">Page</td><td>${escapeHtml(submittedPage)}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:#9CA3AF">Submitted</td><td>${escapeHtml(timestamp)}</td></tr>
        </table>
      </div>
    `;

    try {
      await sendEmail(FEEDBACK_TO, subject, htmlBody, {
        text:
          `${trimmedMessage}\n\n` +
          `From: ${displayName(sender)}\n` +
          `Username: ${sender.username ? `@${sender.username}` : '—'}\n` +
          `Email: ${sender.email || '—'}\n` +
          `Rating: ${normalizedRating ? `${normalizedRating}/5` : '—'}\n` +
          `User ID: ${submittedBy}\n` +
          `Page: ${submittedPage}\n` +
          `Submitted: ${timestamp}`,
      });
    } catch (mailErr) {
      // The feedback itself is valid; only delivery failed. 502 tells the client
      // it may retry rather than pretending the message was delivered.
      console.error('Feedback email failed:', mailErr);
      return res.status(502).json({ error: 'Could not send feedback right now. Please try again.' });
    }

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
