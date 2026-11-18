// Shared rate limiters.
//
// SECURITY: every authenticated API call is capped so a single account cannot
// hammer the backend (or the ZetuPay/Gemini quotas behind it). The money-moving
// and public endpoints keep their own stricter limiters in their route files.

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const TOKEN_KEY_PREFIX = 'token:';

/**
 * Identify a caller by Firebase UID when the route already verified a token,
 * otherwise by a hash of the bearer token, otherwise by IP.
 *
 * Hashing the token keeps raw credentials out of limiter keys. `req.user` is not
 * populated yet when this global limiter runs, so the token hash is the stable
 * per-user identity available at that point.
 */
function keyFor(req) {
  if (req.user?.uid) return `uid:${req.user.uid}`;

  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    if (token) {
      return TOKEN_KEY_PREFIX + crypto.createHash('sha256').update(token).digest('hex');
    }
  }

  return rateLimit.ipKeyGenerator(req.ip);
}

// Webhooks are server-to-server and signed; they must never be throttled by a
// client-facing limiter.
function shouldSkipApiLimit(req) {
  const url = req.originalUrl || req.url || '';
  return (
    url.startsWith('/api/webhooks/') ||
    url.startsWith('/api/payment/zetupay/callback') ||
    url === '/api/health'
  );
}

// 100 requests per minute per authenticated user (or per IP for anonymous
// callers). Generous for the app's normal polling, tight enough to stop abuse.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFor,
  skip: (req) => shouldSkipApiLimit(req),
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

module.exports = { apiLimiter, shouldSkipApiLimit, keyFor };
