const crypto = require('crypto');
const axios = require('axios');

const ZETUPAY_BASE = 'https://api.zetupay.co.ke/v1';
const SECRET = process.env.ZETUPAY_SECRET_KEY;
const CHANNEL_ID = process.env.ZETUPAY_CHANNEL_ID;

const zetupayHeaders = () => ({
  Authorization: `Bearer ${SECRET}`,
  'Content-Type': 'application/json',
});

/**
 * Convert any Kenyan phone format to 2547XXXXXXXX.
 * Accepts 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX and 7XXXXXXXX.
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

/**
 * Send an M-Pesa STK Push request to ZetuPay.
 * Returns { reference, raw } where reference is the provider's transaction
 * identifier (best-effort across common response shapes).
 */
const initiateStkPush = async ({ phone, amount, orderId, description }) => {
  const normalizedPhone = normalizePhone(phone);
  const roundedAmount = Math.round(Number(amount));

  const payload = {
    channel_id: CHANNEL_ID,
    phone: normalizedPhone,
    amount: roundedAmount,
    reference: orderId,
    description: description || `eHub Kenya order ${orderId}`,
  };

  const res = await axios.post(`${ZETUPAY_BASE}/payments/stk-push`, payload, {
    headers: zetupayHeaders(),
  });

  const data = res.data || {};
  const reference =
    data.reference ||
    data.transactionReference ||
    data.transaction_reference ||
    data.transactionId ||
    data.transaction_id ||
    data.id ||
    data.data?.reference ||
    data.data?.transactionId ||
    data.data?.transaction_id ||
    data.data?.id ||
    null;

  return {
    reference: reference != null ? String(reference) : null,
    raw: data,
  };
};

/**
 * Verify a ZetuPay webhook signature: HMAC-SHA256 of the raw request body using
 * ZETUPAY_SECRET_KEY, compared in constant time against the supplied signature.
 */
const verifyWebhookSignature = (rawBody, signature) => {
  if (!rawBody || !signature) return false;

  const provided = String(signature)
    .trim()
    .replace(/^sha256=/i, '')
    .toLowerCase();
  if (!provided) return false;

  const hmac = crypto.createHmac('sha256', SECRET || '');
  hmac.update(rawBody);
  const expectedHex = hmac.digest('hex');

  const a = Buffer.from(expectedHex, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;

  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

module.exports = {
  initiateStkPush,
  verifyWebhookSignature,
  normalizePhone,
};
