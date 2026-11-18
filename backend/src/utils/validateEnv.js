// Startup environment validation.
//
// SECURITY: a backend that boots without its auth/payment secrets is worse than
// one that refuses to boot — it silently accepts requests it cannot validate.
// Production fails fast; development only warns so local UI work stays possible.
//
// Deliberate deviation: JWT_SECRET is NOT hard-required because this service
// authenticates with Firebase ID tokens (Admin SDK) and never signs a JWT.
// Exiting on an unused variable would take production down for no benefit. It
// is still checked behind REQUIRE_JWT_SECRET=true for deployments that add a
// JWT layer later.

const logger = require('../utils/logger');

const REQUIRED_IN_PRODUCTION = ['ADMIN_EMAIL', 'ZETUPAY_SECRET_KEY'];
const REQUIRED_ALWAYS = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];

function validateEnv({ env = process.env } = {}) {
  const isProduction = env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  const present = (name) => typeof env[name] === 'string' && env[name].trim() !== '';

  for (const name of REQUIRED_ALWAYS) {
    if (!present(name)) errors.push(`${name} is required (Firebase Admin cannot authenticate without it)`);
  }

  if (isProduction) {
    for (const name of REQUIRED_IN_PRODUCTION) {
      if (!present(name)) errors.push(`${name} is required in production`);
    }
  } else {
    for (const name of REQUIRED_IN_PRODUCTION) {
      if (!present(name)) warnings.push(`${name} is not set (using the development fallback)`);
    }
  }

  if (env.REQUIRE_JWT_SECRET === 'true' && !present('JWT_SECRET')) {
    errors.push('JWT_SECRET is required because REQUIRE_JWT_SECRET=true');
  } else if (!present('JWT_SECRET')) {
    warnings.push('JWT_SECRET is not set (unused: authentication uses Firebase ID tokens)');
  }

  // Degrade gracefully: email and push stay optional by design.
  if (!present('RESEND_API_KEY')) {
    warnings.push('RESEND_API_KEY is not set — transactional email is disabled, order flows keep working');
  }
  if (!present('VAPID_PUBLIC_KEY') || !present('VAPID_PRIVATE_KEY')) {
    warnings.push('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are not set — web push is disabled');
  }
  if (!present('RESEND_WEBHOOK_SECRET')) {
    warnings.push('RESEND_WEBHOOK_SECRET is not set — POST /api/webhooks/resend will answer 503');
  }

  for (const message of warnings) logger.warn(`[env] ${message}`);
  for (const message of errors) logger.error(`[env] ${message}`);

  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { validateEnv };
