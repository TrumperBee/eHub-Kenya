const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/aiController');
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many messages. Please wait a moment.' },
});

router.post('/chat', aiLimiter, chat);

module.exports = router;
