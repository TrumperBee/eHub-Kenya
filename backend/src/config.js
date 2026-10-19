function normalizeUrl(value) {
  if (!value) return '';
  return value.trim().replace(/\/+$/, '');
}

// Primary production host plus its www alias. The live site is served at
// www.ehubmarket.me (the apex 308-redirects to www), so BOTH origins must be
// in the allowlist or the browser's CORS preflight is rejected.
const PROD_FRONTENDS = ['https://ehubmarket.me', 'https://www.ehubmarket.me'];
const PROD_FRONTEND = PROD_FRONTENDS[0];
const DEV_FRONTENDS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const configuredOrigins = String(process.env.FRONTEND_URL || '')
  .split(',')
  .map(normalizeUrl)
  .filter(Boolean);

/** Primary frontend origin used for redirects (Paystack callback/cancel). */
const FRONTEND_URL =
  normalizeUrl(process.env.FRONTEND_URL) ||
  (process.env.NODE_ENV === 'production' ? PROD_FRONTEND : DEV_FRONTENDS[0]);

/**
 * Secure CORS allowlist. Never '*' — the API uses bearer tokens and creds.
 * Includes dev origins, the production origins (apex + www), plus any extra
 * origins supplied via FRONTEND_URL (comma-separated accepted, trailing slashes trimmed).
 */
const ALLOWED_ORIGINS = [
  ...new Set([FRONTEND_URL, ...PROD_FRONTENDS, ...DEV_FRONTENDS, ...configuredOrigins]),
];

module.exports = { FRONTEND_URL, ALLOWED_ORIGINS };