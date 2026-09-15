const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const paymentRoutes = require('./src/routes/payment.routes');
const escrowRoutes = require('./src/routes/escrow.routes');
const aiRoutes = require('./src/routes/ai.routes');
const dropRoutes = require('./src/routes/drop.routes');
const emailRoutes = require('./src/routes/email.routes');
const statsRoutes = require('./src/routes/stats.routes');
const errorHandler = require('./src/middleware/errorHandler');
const { ALLOWED_ORIGINS } = require('./src/config');
const { startStatsReconciler } = require('./src/services/statsRecoService');

const app = express();
const PORT = process.env.PORT || 5000;

// Secure CORS allowlist: dev + production Vercel origins (plus any additional
// origins from the FRONTEND_URL env var). Requests without an Origin header
// (Paystack webhooks, health checks, server-to-server) are allowed.
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'eFootball Hub Kenya Backend' });
});

app.use('/api/payment', paymentRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/drops', dropRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/stats', statsRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`eFootball Hub Kenya Backend running on port ${PORT}`);
  startStatsReconciler();
});
