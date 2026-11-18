const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { chat } = require('../controllers/aiController');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');

// SECURITY: the assistant proxies a paid Gemini key, so it is authenticated and
// rate-limited. Anonymous callers previously could burn the quota.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.uid || rateLimit.ipKeyGenerator(req.ip),
  message: { error: 'Too many messages. Please wait a moment.' },
});

router.post('/chat', verifyFirebaseToken, aiLimiter, chat);

module.exports = router;
