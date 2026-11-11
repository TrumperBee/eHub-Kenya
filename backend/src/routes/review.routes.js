const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { submitReview } = require('../controllers/reviewController');

const reviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many review attempts. Please wait a minute.' },
});

router.post('/', verifyFirebaseToken, reviewLimiter, submitReview);

module.exports = router;
