// Secure CORS + frontend URL configuration.
//
// SECURITY: the API uses bearer tokens (and reads/writes user money flows), so
// the allowlist is explicit. There is no '*' origin and no pattern matching.
// Adding a new frontend domain is a code change on purpose — an env var typo
// must never silently widen who can call this API.

function normalizeUrl(value) {
  if (!value) return '';
  return value.trim().replace(/\/+$/, '');
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Primary production host plus its www alias. The live site is served at
// www.ehubmarket.me (the apex 308-redirects to www), so BOTH origins must be
// in the allowlist or the browser's CORS preflight is rejected.
// ehubkenya.vercel.app is kept during the Render/Vercel transition.
const PROD_FRONTENDS = [
  'https://www.ehubmarket.me',
  'https://ehubmarket.me',
  'https://ehubkenya.vercel.app',
];

// SECURITY: development origins are only compiled into the allowlist outside
// production, so a production deployment cannot be called from localhost.
const DEV_FRONTENDS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const configuredOrigin = normalizeUrl(process.env.FRONTEND_URL);

/** Primary frontend origin used for redirects (payment callback/cancel). */
const FRONTEND_URL = IS_PRODUCTION
  ? PROD_FRONTENDS[0]
  : configuredOrigin || DEV_FRONTENDS[0];

/**
 * The ONLY origins allowed to call this API from a browser.
 */
const ALLOWED_ORIGINS = IS_PRODUCTION
  ? [...PROD_FRONTENDS]
  : [...PROD_FRONTENDS, ...DEV_FRONTENDS];

module.exports = { FRONTEND_URL, ALLOWED_ORIGINS, IS_PRODUCTION };
