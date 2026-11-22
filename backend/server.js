const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// SECURITY: fail fast when auth/payment secrets are missing. Runs before any
// route module is required so a misconfigured deploy never starts listening.
const { validateEnv } = require('./src/utils/validateEnv');
const envCheck = validateEnv();
if (!envCheck.ok) {
  console.error('[env] Refusing to start with an invalid environment.');
  process.exit(1);
}

const paymentRoutes = require('./src/routes/payment.routes');
const escrowRoutes = require('./src/routes/escrow.routes');
const aiRoutes = require('./src/routes/ai.routes');
const dropRoutes = require('./src/routes/drop.routes');
const emailRoutes = require('./src/routes/email.routes');
const statsRoutes = require('./src/routes/stats.routes');
const reviewRoutes = require('./src/routes/review.routes');
const settingsRoutes = require('./src/routes/settings.routes');
const pushRoutes = require('./src/routes/push.routes');
const feedbackRoutes = require('./src/routes/feedback.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const adminRoutes = require('./src/routes/admin.routes');
const resendWebhookRoutes = require('./src/routes/resendWebhook.routes');
const errorHandler = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const { ALLOWED_ORIGINS } = require('./src/config');
const { startStatsReconciler } = require('./src/services/statsRecoService');
const { startOverdueSellerScheduler } = require('./src/services/sellerOverdueSweep');
const { checkConnectivity, getConnectivity } = require('./src/services/zetupayService');

const app = express();
const PORT = process.env.PORT || 5000;

// Secure CORS allowlist: the three production origins (apex + www + the legacy
// Vercel host) and, outside production only, the local dev origins. There is
// deliberately no wildcard and no env-var expansion.
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
// Resend webhooks are signed over the raw bytes, so this route MUST be mounted
// before express.json() parses the body. It owns its own raw parser.
app.use(
  '/api/webhooks/resend',
  express.raw({ type: '*/*', limit: '1mb' }),
  resendWebhookRoutes
);
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(morgan('dev'));

// SECURITY: 100 req/min per signed-in user (or per IP). Signed webhooks and the
// health probe are skipped so provider callbacks are never throttled.
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'eFootball Hub Kenya Backend',
    // Last known ZetuPay reachability, checked at boot. Useful for diagnosing
    // payment failures without access to server logs.
    payments: getConnectivity() || { checked: false },
  });
});

app.use('/api/payment', paymentRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/drops', dropRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/feedback', feedbackRoutes);
// Authenticated, rate-limited cross-user notifications (Admin SDK write).
app.use('/api/notifications', notificationRoutes);
// Admin-only order administration (payouts, dispute review).
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`eFootball Hub Kenya Backend running on port ${PORT}`);
  startStatsReconciler();
  // 5h reminder / 24h flag / auto-suspend. Runs at boot and every 60 minutes.
  startOverdueSellerScheduler();
  checkConnectivity().then((c) => {
    if (c.ok) {
      console.log(`[zetupay] connectivity OK (HTTP ${c.status}, ${c.elapsedMs}ms)`);
    } else {
      console.error('[zetupay] connectivity FAILED:', JSON.stringify(c));
    }
  });
});
