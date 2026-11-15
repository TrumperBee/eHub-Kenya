const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const {
  initiateStkPushPayment,
  handleZetupayWebhook,
  getOrderStatus,
} = require('../controllers/zetupayController');

// DEPRECATED — Paystack controller is kept on disk for rollback but no longer
// mounted. See the commented routes at the bottom of this file.
// const { initializePayment, cancelPayment, verifyPayment, handleCallback, handleWebhook, handlePaystackCancel } = require('../controllers/paystackController');

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many payment requests. Please wait.' },
});

// STK Push is the money-moving call, so it is limited per buyer (Firebase UID)
// rather than per IP: five attempts in a rolling 30-minute window. `req.user`
// is always populated here because verifyFirebaseToken runs first.
const STK_PUSH_WINDOW_MS = 30 * 60 * 1000;
const STK_PUSH_MAX_ATTEMPTS = 5;

const stkPushLimiter = rateLimit({
  windowMs: STK_PUSH_WINDOW_MS,
  max: STK_PUSH_MAX_ATTEMPTS,
  keyGenerator: (req) => req.user?.uid || 'anonymous',
  message: {
    error: 'You have made too many payment attempts. Please wait 30 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many status checks. Please slow down.' },
});

// --- ZetuPay (M-Pesa STK Push) ---
router.post('/stk-push', verifyFirebaseToken, stkPushLimiter, initiateStkPushPayment);

// Attempts used in the current 30-minute window, so checkout can tell the
// buyer "X of 5 attempts used" before they push again.
router.get('/stk-push/attempts', verifyFirebaseToken, statusLimiter, async (req, res) => {
  try {
    const info = await stkPushLimiter.getKey(req.user.uid);
    const resetTimeMs = info?.resetTime ? new Date(info.resetTime).getTime() : 0;
    const used = resetTimeMs > Date.now() ? info.totalHits : 0;
    // The limiter increments before it rejects, so blocked retries can push the
    // raw count past the maximum — report a single "limit reached" value.
    const attempts = Math.min(used, STK_PUSH_MAX_ATTEMPTS);

    res.json({
      attempts,
      limit: STK_PUSH_MAX_ATTEMPTS,
      remaining: Math.max(STK_PUSH_MAX_ATTEMPTS - attempts, 0),
      resetAt: attempts > 0 ? new Date(resetTimeMs).toISOString() : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not check payment attempts.' });
  }
});

router.post('/zetupay/callback', handleZetupayWebhook);
router.get('/order-status/:orderId', verifyFirebaseToken, statusLimiter, getOrderStatus);

// --- Deprecated Paystack routes (kept for rollback; DO NOT delete) ---
// router.post('/initialize', verifyFirebaseToken, paymentLimiter, initializePayment);
// router.post('/cancel', verifyFirebaseToken, cancelPayment);
// router.post('/verify', verifyFirebaseToken, paymentLimiter, verifyPayment);
// router.get('/paystack/callback', handleCallback);
// router.get('/paystack/cancel', handlePaystackCancel);
// router.post('/paystack/webhook', handleWebhook);

module.exports = router;
