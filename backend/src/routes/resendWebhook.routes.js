// Resend webhook receiver -> Telegram alert.
//
// Resend signs webhooks with Svix. The signature is computed over the exact raw
// request bytes, so this router is mounted in server.js BEFORE express.json()
// and parses the body itself with express.raw(). Verifying a re-serialized JSON
// object would always fail.
//
// Setup:
//   Resend dashboard -> Webhooks -> Add endpoint
//     URL: https://ehub-kenya.onrender.com/api/webhooks/resend
//     Events: all (or at least delivered / bounced / complained / failed)
//   Copy the "Signing Secret" (whsec_...) into RESEND_WEBHOOK_SECRET.
//
// Alerts are fire-and-forget: Telegram problems never block Resend (Resend
// retries any non-2xx response, so we always answer 200 once the payload is
// authentic).

const express = require('express');
const crypto = require('crypto');
const https = require('https');
const logger = require('../utils/logger');

const router = express.Router();

// Svix rejects timestamps older than 5 minutes; mirror that to stop replays.
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const TELEGRAM_TIMEOUT_MS = 8000;

/**
 * Verify a Svix signature (`svix-id`, `svix-timestamp`, `svix-signature`).
 * Supports multiple space-separated signatures and the `v1,<base64>` form.
 */
function verifySvixSignature(rawBody, headers, secret) {
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signatureHeader = headers['svix-signature'];

  if (!id || !timestamp || !signatureHeader || !secret) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS) return false;

  // Svix secrets are base64-encoded bytes behind a whsec_ prefix.
  const secretBytes = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const signedContent = `${id}.${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  return String(signatureHeader)
    .split(' ')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      const signature = entry.includes(',') ? entry.split(',')[1] : entry;
      const given = Buffer.from(signature);
      const wanted = Buffer.from(expected);
      return given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
    });
}

const singleLine = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

/**
 * Build the human-readable Telegram summary for one Resend event.
 */
function buildSummary(event) {
  const type = singleLine(event?.type) || 'unknown.event';
  const data = event?.data || {};

  const to = Array.isArray(data.to) ? data.to.join(', ') : data.to;
  const domain =
    (data.domain && (data.domain.name || data.domain)) || data.domain_name || data.domain;
  const target = singleLine(to) || singleLine(domain) || 'unknown recipient';

  const reason = singleLine(
    data.bounce?.message ||
      data.bounce?.subType ||
      data.reason ||
      data.error?.message ||
      data.error ||
      ''
  );

  const isProblem = /bounce|fail|complain|reject|delay/i.test(type);
  const isGood = /delivered|sent/i.test(type);
  const icon = isProblem ? '⚠️' : isGood ? '✅' : '📧';

  const lines = [
    `${icon} Resend: ${type}`,
    `Target: ${target}`,
  ];
  if (data.subject) lines.push(`Subject: ${singleLine(data.subject)}`);
  if (reason) lines.push(`Reason: ${reason}`);
  lines.push(`Time: ${new Date().toISOString()}`);

  // Telegram caps messages at 4096 characters.
  return lines.join('\n').slice(0, 3900);
}

function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    logger.warn('Telegram alert skipped: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set');
    return Promise.resolve({ status: 'not_configured' });
  }

  const body = JSON.stringify({
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: TELEGRAM_TIMEOUT_MS,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve({ status: 'sent' });
          // Never include the token (it is part of the request path) in logs.
          return reject(new Error(`Telegram HTTP ${res.statusCode}: ${responseBody.slice(0, 200)}`));
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Telegram request timed out')));
    req.write(body);
    req.end();
  });
}

router.post('/', (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET || '';
  if (!secret) {
    logger.error('Resend webhook rejected: RESEND_WEBHOOK_SECRET is not configured');
    return res.status(503).json({ error: 'Webhook secret not configured' });
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.rawBody || '');
  if (!rawBody.length) {
    return res.status(400).json({ error: 'Empty request body' });
  }

  if (!verifySvixSignature(rawBody, req.headers, secret)) {
    logger.warn('Resend webhook rejected: invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const summary = buildSummary(event);

  // Acknowledge immediately so Resend does not retry; Telegram is best-effort.
  res.status(200).json({ received: true });
  sendTelegram(summary).catch((err) => {
    logger.error(`Telegram alert failed: ${err.message}`);
  });
});

module.exports = router;
// Exported for local verification scripts; not used by the app.
module.exports.verifySvixSignature = verifySvixSignature;
module.exports.buildSummary = buildSummary;
