"use strict";

// eHub Kenya — Resend webhook (Svix signature + Telegram summary) tests.
// Run with: node --test test/  (from backend/)
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const express = require('express');

const router = require('../src/routes/resendWebhook.routes');
const { verifySvixSignature, buildSummary } = router;

const SECRET = 'whsec_' + Buffer.from('unit-test-signing-secret').toString('base64');

const sign = (id, timestamp, body, secret = SECRET) =>
  crypto
    .createHmac('sha256', Buffer.from(secret.replace(/^whsec_/, ''), 'base64'))
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64');

const now = () => String(Math.floor(Date.now() / 1000));

test('accepts a correctly signed payload', () => {
  const id = 'msg_1';
  const ts = now();
  const body = JSON.stringify({ type: 'email.delivered', data: { to: ['a@b.com'] } });
  const headers = { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${sign(id, ts, body)}` };
  assert.equal(verifySvixSignature(Buffer.from(body), headers, SECRET), true);
});

test('rejects a tampered body', () => {
  const id = 'msg_1';
  const ts = now();
  const body = JSON.stringify({ type: 'email.delivered' });
  const headers = { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${sign(id, ts, body)}` };
  assert.equal(verifySvixSignature(Buffer.from(`${body} `), headers, SECRET), false);
});

test('rejects the wrong secret, stale timestamps and missing headers', () => {
  const id = 'msg_1';
  const ts = now();
  const body = '{"type":"email.delivered"}';
  const signature = `v1,${sign(id, ts, body)}`;

  const otherSecret = 'whsec_' + Buffer.from('different-secret').toString('base64');
  assert.equal(verifySvixSignature(Buffer.from(body), { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': signature }, otherSecret), false);

  assert.equal(verifySvixSignature(Buffer.from(body), { 'svix-id': id, 'svix-timestamp': String(Number(ts) - 3600), 'svix-signature': signature }, SECRET), false);
  assert.equal(verifySvixSignature(Buffer.from(body), {}, SECRET), false);
  assert.equal(verifySvixSignature(Buffer.from(body), { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': signature }, ''), false);
});

test('accepts any valid signature when several are listed', () => {
  const id = 'msg_1';
  const ts = now();
  const body = '{"type":"email.delivered"}';
  const headers = {
    'svix-id': id,
    'svix-timestamp': ts,
    'svix-signature': `v1,not-the-real-one v1,${sign(id, ts, body)}`,
  };
  assert.equal(verifySvixSignature(Buffer.from(body), headers, SECRET), true);
});

test('summary shows event type, target and bounce reason', () => {
  const summary = buildSummary({
    type: 'email.bounced',
    data: { to: ['buyer@example.com'], subject: 'Order paid', bounce: { message: 'Mailbox full' } },
  });
  assert.match(summary, /email\.bounced/);
  assert.match(summary, /buyer@example\.com/);
  assert.match(summary, /Mailbox full/);
  assert.match(summary, /⚠️/);
});

test('summary falls back to the domain and error message', () => {
  const domainSummary = buildSummary({ type: 'domain.verified', data: { domain: { name: 'ehubmarket.me' } } });
  assert.match(domainSummary, /ehubmarket\.me/);

  const failed = buildSummary({ type: 'email.failed', data: { to: 'x@y.com', error: { message: 'Domain not verified' } } });
  assert.match(failed, /Domain not verified/);
});

test('summary is a single message and never exceeds Telegram limits', () => {
  const summary = buildSummary({
    type: 'email.delivered',
    data: { to: ['a@b.com'], subject: 'x'.repeat(9000), bounce: { message: 'y'.repeat(9000) } },
  });
  assert.ok(summary.length <= 3900);
});

// --- HTTP behaviour (mirrors the mount in server.js) -----------------------

function createApp() {
  const app = express();
  app.use('/api/webhooks/resend', express.raw({ type: '*/*', limit: '1mb' }), router);
  return app;
}

function post(body, headers) {
  return new Promise((resolve, reject) => {
    const server = createApp().listen(0, () => {
      const { port } = server.address();
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/webhooks/resend',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode, body: data });
          });
        }
      );
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      req.end(body);
    });
  });
}

test('answers 503 when the signing secret is not configured', async (t) => {
  const previous = process.env.RESEND_WEBHOOK_SECRET;
  delete process.env.RESEND_WEBHOOK_SECRET;
  t.after(() => {
    if (previous === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = previous;
  });

  const res = await post('{"type":"email.delivered"}', {});
  assert.equal(res.status, 503);
});

test('answers 401 for an invalid signature', async (t) => {
  const previous = process.env.RESEND_WEBHOOK_SECRET;
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  t.after(() => {
    if (previous === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = previous;
  });

  const id = 'msg_1';
  const ts = now();
  const res = await post('{"type":"email.delivered"}', {
    'svix-id': id,
    'svix-timestamp': ts,
    'svix-signature': 'v1,invalid',
  });
  assert.equal(res.status, 401);
});

test('answers 200 for a valid event even when Telegram is not configured', async (t) => {
  const previousSecret = process.env.RESEND_WEBHOOK_SECRET;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChat = process.env.TELEGRAM_CHAT_ID;
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = previousSecret;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;
    if (previousChat === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = previousChat;
  });

  const body = JSON.stringify({ type: 'email.delivered', data: { to: ['a@b.com'] } });
  const id = 'msg_1';
  const ts = now();
  const res = await post(body, {
    'svix-id': id,
    'svix-timestamp': ts,
    'svix-signature': `v1,${sign(id, ts, body)}`,
  });
  assert.equal(res.status, 200);
  assert.equal(JSON.parse(res.body).received, true);
});
