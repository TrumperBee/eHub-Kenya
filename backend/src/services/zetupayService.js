const crypto = require('crypto');
const axios = require('axios');

/**
 * ZetuPay API client (M-Pesa STK Push).
 *
 * Docs: https://www.zetupay.co.ke/docs/stk-push
 *   POST https://pay.zetupay.co.ke/api/v1/payment/stk-push
 *   GET  https://pay.zetupay.co.ke/api/v1/payment/stk-push/{paymentKey}
 *
 * The Secret Key must only ever be used server-side — ZetuPay rejects STK Push
 * requests that come from a browser.
 */
const BASE_URL = 'https://pay.zetupay.co.ke/api/v1';
const WEBHOOK_TOLERANCE_SECONDS = 300; // documented replay window
const MAX_STK_AMOUNT = 250000; // documented upper bound for STK Push
const REQUEST_TIMEOUT_MS = 20000;

// The base URL is fixed by ZetuPay's docs. It is intentionally NOT configurable
// via env: a stale override (e.g. the old api.zetupay.co.ke host) is a silent
// outage waiting to happen.
const baseUrl = () => BASE_URL;
const secretKey = () => (process.env.ZETUPAY_SECRET_KEY || '').trim();

if (!secretKey()) {
  console.warn('[zetupay] ZETUPAY_SECRET_KEY is not set — payments will fail');
} else {
  console.log(`[zetupay] API base ${BASE_URL} | key ${secretKey().slice(0, 8)}…`);
}

class ZetupayError extends Error {
  constructor(message, { status, providerMessage, code } = {}) {
    super(message);
    this.name = 'ZetupayError';
    this.status = status || null;
    this.providerMessage = providerMessage || null;
    this.code = code || 'ZETUPAY_ERROR';
  }
}

const authHeaders = () => {
  const key = secretKey();
  if (!key) {
    throw new ZetupayError('ZetuPay is not configured', { code: 'ZETUPAY_NOT_CONFIGURED' });
  }
  return {
    Authorization: `Bearer ${key}`,
    // ZetuPay also accepts the key in x-secret-key; send both so a proxy that
    // strips Authorization cannot break payments.
    'x-secret-key': key,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
};

/**
 * Convert any Kenyan phone format to 2547XXXXXXXX / 2541XXXXXXXX.
 * Accepts 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX and 7XXXXXXXX.
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
};

const isValidMpesaPhone = (phone) => /^254(7|1)\d{8}$/.test(phone);

const providerMessageFrom = (err) => {
  const data = err?.response?.data;
  if (!data) return null;
  if (typeof data === 'string') return data.slice(0, 300);
  return data.message || data.error || data.detail || null;
};

// --- Collection channel resolution -----------------------------------------
// channelId must be the numeric id of an active collection channel (e.g.
// "1214"), not its name. A bad value makes ZetuPay reject the whole payment
// with a 400, so we normalise it and fall back to the wallet's only active
// channel instead of letting a config typo block checkout.
const CHANNEL_CACHE_TTL_MS = 5 * 60 * 1000;
let channelCache = { at: 0, channels: null };

const normalizeChannelId = (raw) => {
  if (raw == null) return null;
  const value = String(raw)
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/^#/, '')
    .trim();
  return /^\d{1,10}$/.test(value) ? value : null;
};

async function getActiveChannels() {
  if (Date.now() - channelCache.at < CHANNEL_CACHE_TTL_MS) {
    return channelCache.channels;
  }
  try {
    const res = await axios.get(`${baseUrl()}/collection-channels`, {
      headers: authHeaders(),
      params: { active: true, pageSize: 100 },
      timeout: 8000,
    });
    const list = res?.data?.data;
    channelCache = { at: Date.now(), channels: Array.isArray(list) ? list : null };
  } catch (err) {
    console.warn(
      '[zetupay] could not list collection channels:',
      providerMessageFrom(err) || err?.message || err?.code
    );
    // Short negative cache so a failing lookup doesn't add latency to retries.
    channelCache = { at: Date.now(), channels: null };
  }
  return channelCache.channels;
}

async function resolveChannelId() {
  const rawConfigured = (process.env.ZETUPAY_CHANNEL_ID || '').trim();
  const configured = normalizeChannelId(rawConfigured);
  if (rawConfigured && !configured) {
    console.warn(
      '[zetupay] ignoring ZETUPAY_CHANNEL_ID: it must be the numeric collection ' +
      'channel id (e.g. 1214), not the channel name'
    );
  }

  const channels = await getActiveChannels();
  const active = (channels || []).filter((c) => c && c.active !== false);

  if (configured) {
    if (!channels || active.some((c) => String(c.id) === configured)) return configured;
    console.warn(
      `[zetupay] ZETUPAY_CHANNEL_ID=${configured} is not an active collection ` +
      'channel for this wallet; falling back'
    );
  }

  if (active.length === 1) {
    const only = String(active[0].id);
    console.log(
      `[zetupay] using the only active collection channel ${only} ` +
      `(${active[0].name || 'unnamed'})`
    );
    return only;
  }

  if (active.length > 1) {
    console.warn(
      '[zetupay] several active collection channels — set ZETUPAY_CHANNEL_ID ' +
      'to choose which one receives payments'
    );
  }

  return null;
}

// Last known provider connectivity, surfaced on /api/health so a deployment can
// be diagnosed from a browser without digging through server logs.
let connectivity = null;

async function checkConnectivity() {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  const key = secretKey();
  if (!key) {
    connectivity = {
      configured: false,
      ok: false,
      checkedAt,
      error: 'ZETUPAY_SECRET_KEY is not set',
    };
    return connectivity;
  }

  try {
    const res = await axios.get(`${baseUrl()}/collection-channels`, {
      headers: authHeaders(),
      params: { pageSize: 100 },
      timeout: 10000,
    });
    const list = Array.isArray(res?.data?.data) ? res.data.data : [];
    const active = list.filter((c) => c && c.active !== false);
    // Seed the resolver's cache so resolving the channel costs no extra request.
    channelCache = { at: Date.now(), channels: list };
    connectivity = {
      configured: true,
      ok: true,
      baseUrl: baseUrl(),
      status: res.status,
      // Surfaced so a channel misconfiguration is visible without log access.
      channels: active.map((c) => ({ id: String(c.id), name: c.name || null, type: c.type || null })),
      channelId: await resolveChannelId(),
      elapsedMs: Date.now() - started,
      checkedAt,
    };
  } catch (err) {
    connectivity = {
      configured: true,
      ok: false,
      baseUrl: baseUrl(),
      status: err?.response?.status || null,
      // e.g. "getaddrinfo ENOTFOUND pay.zetupay.co.ke", "ETIMEDOUT",
      // or ZetuPay's own message (for 401/402/...)
      error: providerMessageFrom(err) || (err?.response ? null : err?.message) || err?.code || 'unknown',
      elapsedMs: Date.now() - started,
      checkedAt,
    };
  }
  return connectivity;
}

const getConnectivity = () => connectivity;

/**
 * Trigger an M-Pesa STK Push.
 *
 * @param {object} args
 * @param {string} args.phone      Customer phone in any Kenyan format
 * @param {number} args.amount     Whole shillings, 1..250000
 * @param {string} args.orderId    Our order id — sent as `reference` and used as
 *                                 the idempotency key so retries never prompt twice
 * @param {string} [args.buyerId]  Sent as `identifier` and echoed in the webhook
 * @returns {Promise<{paymentKey: string, waveTransactionId: string, reference: string,
 *                    status: string, checkoutRequestId: string, raw: object}>}
 */
const initiateStkPush = async ({ phone, amount, orderId, buyerId }) => {
  const normalizedPhone = normalizePhone(phone);
  if (!isValidMpesaPhone(normalizedPhone)) {
    throw new ZetupayError('Enter a valid M-Pesa number', { code: 'INVALID_PHONE' });
  }

  const roundedAmount = Math.round(Number(amount));
  if (!Number.isFinite(roundedAmount) || roundedAmount < 1 || roundedAmount > MAX_STK_AMOUNT) {
    throw new ZetupayError(
      `Amount must be between KES 1 and KES ${MAX_STK_AMOUNT.toLocaleString()}`,
      { code: 'INVALID_AMOUNT' }
    );
  }

  const reference = String(orderId || '').slice(0, 100);
  if (!reference) {
    throw new ZetupayError('An order reference is required', { code: 'INVALID_REFERENCE' });
  }

  const payload = {
    amount: roundedAmount,
    // ZetuPay sends the prompt to exactly this number.
    phoneNumber: normalizedPhone,
    reference,
    currency: 'KES',
  };
  if (buyerId) payload.identifier = String(buyerId).slice(0, 100);
  // Route to the configured collection channel, or the wallet's only active
  // one. A malformed env value is ignored instead of failing the payment.
  const resolvedChannelId = await resolveChannelId();
  if (resolvedChannelId) payload.channelId = resolvedChannelId;

  const headers = {
    ...authHeaders(),
    // Unique per order: a network retry returns the original payment instead of
    // sending the customer a second prompt (keys last 24h).
    'Idempotency-Key': reference,
  };

  const shouldRetry = (err) => {
    const status = err?.response?.status;
    // No HTTP response (DNS/socket/timeout) or a provider-side 5xx: safe to
    // retry because the Idempotency-Key makes the request idempotent.
    if (!status) return true;
    return status >= 500 && status !== 501;
  };

  let res;
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      res = await axios.post(`${baseUrl()}/payment/stk-push`, payload, {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
      });
      break;
    } catch (err) {
      lastErr = err;
      if (attempt === 2 || !shouldRetry(err)) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (!res) {
    const err = lastErr || {};
    const status = err?.response?.status || null;
    // Keep the network/DNS detail for the log when there is no HTTP response.
    const providerMessage = providerMessageFrom(err) || (err?.response ? null : err?.message) || err?.code || null;
    const code =
      status === 400 ? 'ZETUPAY_VALIDATION_FAILED'
      : status === 401 ? 'ZETUPAY_AUTH_FAILED'
      : status === 402 ? 'ZETUPAY_NO_PLAN'
      : status === 403 ? 'ZETUPAY_FORBIDDEN'
      : status === 404 ? 'ZETUPAY_CHANNEL_NOT_FOUND'
      : status === 409 ? 'ZETUPAY_IDEMPOTENCY_CONFLICT'
      : status === 410 ? 'ZETUPAY_PAYMENT_EXPIRED'
      : status === 422 ? 'ZETUPAY_NOT_SET_UP'
      : status === 429 ? 'ZETUPAY_RATE_LIMITED'
      : status === 502 ? 'ZETUPAY_MPESA_REJECTED'
      : status === 500 ? 'ZETUPAY_SERVER_ERROR'
      : (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') ? 'ZETUPAY_TIMEOUT'
      : 'ZETUPAY_REQUEST_FAILED';
    throw new ZetupayError(providerMessage || 'ZetuPay request failed', {
      status,
      providerMessage,
      code,
    });
  }

  const data = res?.data?.data || res?.data || {};
  const paymentKey = data.paymentKey || null;
  const waveTransactionId = data.waveTransactionId || null;

  if (!paymentKey && !waveTransactionId) {
    throw new ZetupayError('ZetuPay did not return a payment identifier', {
      status: res?.status || null,
      code: 'ZETUPAY_BAD_RESPONSE',
    });
  }

  return {
    paymentKey,
    waveTransactionId,
    reference: data.reference || reference,
    status: data.status || 'processing',
    checkoutRequestId: data.checkoutRequestId || null,
    raw: data,
  };
};

/**
 * Look up a payment by paymentKey. Statuses: pending, processing, success,
 * failed, cancelled, expired.
 */
const getPaymentStatus = async (paymentKey) => {
  if (!paymentKey) {
    throw new ZetupayError('A payment key is required', { code: 'INVALID_PAYMENT_KEY' });
  }

  try {
    const res = await axios.get(
      `${baseUrl()}/payment/stk-push/${encodeURIComponent(paymentKey)}`,
      { headers: authHeaders(), timeout: REQUEST_TIMEOUT_MS }
    );
    return res?.data?.data || res?.data || null;
  } catch (err) {
    const status = err?.response?.status || null;
    const providerMessage = providerMessageFrom(err) || (err?.response ? null : err?.message);
    throw new ZetupayError(providerMessage || 'Could not check the payment status', {
      status,
      providerMessage,
      code: status === 404 ? 'ZETUPAY_PAYMENT_NOT_FOUND' : 'ZETUPAY_STATUS_FAILED',
    });
  }
};

const safeEqualHex = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

/**
 * Parse `x-zetupay-signature: t=<unix>,v1=<hex>`.
 * v1 = HMAC-SHA256(secret, `${t}.${rawBody}`), hex encoded.
 * Rejects timestamps older (or further ahead) than 5 minutes.
 *
 * A plain hex HMAC of the raw body is also accepted for older integrations
 * (header `x-signature` / bare signature) — but the signed-timestamp format is
 * what ZetuPay documents and sends.
 */
const verifyWebhookSignature = (rawBody, signatureHeader, options = {}) => {
  // Webhooks are always signed with the wallet's LIVE secret key, even when
  // the API is called with a test key. Accept either, plus an explicit
  // ZETUPAY_WEBHOOK_SECRET, so a test-mode API key still verifies live events
  // and key rotation doesn't drop webhooks mid-flight.
  const secrets = [
    options.secret,
    secretKey(),
    process.env.ZETUPAY_WEBHOOK_SECRET,
  ]
    .map((s) => (s || '').trim())
    .filter((s, i, arr) => s && arr.indexOf(s) === i);

  if (!rawBody || !signatureHeader || secrets.length === 0) return false;

  const header = String(signatureHeader).trim();
  if (!header) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);

  // Windowed signature: t=<unix>,v1=<hex>[,v1=<hex>...]
  const parts = header.split(',').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name || !value) return acc;
    if (name === 'v1') {
      (acc.v1 = acc.v1 || []).push(value);
    } else if (!(name in acc)) {
      acc[name] = value;
    }
    return acc;
  }, {});

  if (parts.t != null && Array.isArray(parts.v1)) {
    const timestamp = Number(parts.t);
    if (!Number.isFinite(timestamp)) return false;
    if (Math.abs(nowSeconds - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

    const signingPayload = `${parts.t}.${rawBody}`;
    return secrets.some((secret) => {
      const expected = crypto.createHmac('sha256', secret).update(signingPayload).digest('hex');
      return parts.v1.some((candidate) => safeEqualHex(expected, candidate.toLowerCase()));
    });
  }

  // Legacy: signature is the hex HMAC of the raw body only.
  const legacy = header.replace(/^sha256=/i, '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(legacy)) return false;

  return secrets.some((secret) => {
    const expectedLegacy = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return safeEqualHex(expectedLegacy, legacy);
  });
};

module.exports = {
  initiateStkPush,
  getPaymentStatus,
  verifyWebhookSignature,
  normalizePhone,
  isValidMpesaPhone,
  checkConnectivity,
  getConnectivity,
  ZetupayError,
  MAX_STK_AMOUNT,
};
