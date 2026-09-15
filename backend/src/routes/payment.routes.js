const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { initializePayment, cancelPayment, verifyPayment, handleCallback, handleWebhook, handlePaystackCancel } = require('../controllers/paystackController');
const rateLimit = require('express-rate-limit');

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many payment requests. Please wait.' },
});

router.post('/initialize', verifyFirebaseToken, paymentLimiter, initializePayment);
router.post('/cancel', verifyFirebaseToken, cancelPayment);
router.post('/verify', verifyFirebaseToken, paymentLimiter, verifyPayment);

router.get('/paystack/callback', handleCallback);
router.get('/paystack/cancel', handlePaystackCancel);
router.post('/paystack/webhook', handleWebhook);

module.exports = router;
