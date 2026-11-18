const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { sendEmail } = require('../services/emailService');

// Anonymous feedback is allowed, so the limiter is per IP. Three submissions an
// hour is plenty for a human and stops anyone using the form as a mail relay.
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many feedback submissions. Please try again later.' },
});

const FEEDBACK_TO = 'ochiengv250@gmail.com';
const MAX_MESSAGE_LENGTH = 500;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

router.post('/', feedbackLimiter, async (req, res, next) => {
  try {
    const { message, rating, userId, page } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    const trimmedMessage = message.trim();
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    let normalizedRating = null;
    if (rating !== null && rating !== undefined && rating !== '') {
      const parsed = Number(rating);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
      }
      normalizedRating = parsed;
    }

    const submittedBy =
      typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous';
    const submittedPage =
      typeof page === 'string' && page.trim() ? page.trim() : '/';
    // Server-side timestamp — the browser clock is not trustworthy for audits.
    const timestamp = new Date().toISOString();

    const subject = normalizedRating
      ? `eHub Market Feedback — ⭐${normalizedRating}/5`
      : 'eHub Market Feedback — New Feedback';

    const htmlBody = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;line-height:1.6">
        <h2 style="margin:0 0 4px">eHub Market Feedback</h2>
        <p style="margin:0 0 16px;color:#6B7280;font-size:13px">
          ${normalizedRating ? `Rating: ⭐ ${normalizedRating}/5` : 'No rating given'}
        </p>
        <div style="background:#F6F7FB;border-left:4px solid #003BFF;padding:12px 16px;white-space:pre-wrap">
          ${escapeHtml(trimmedMessage)}
        </div>
        <table style="margin-top:16px;font-size:13px;color:#374151">
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
