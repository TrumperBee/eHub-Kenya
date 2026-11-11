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

const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many status checks. Please slow down.' },
});

// --- ZetuPay (M-Pesa STK Push) ---
router.post('/stk-push', verifyFirebaseToken, paymentLimiter, initiateStkPushPayment);
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
