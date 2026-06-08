const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const paymentController = require('../controllers/paymentController');

router.post('/initiate', verifyFirebaseToken, paymentController.initiate);
router.post('/callback', paymentController.callback);
router.get('/status/:checkoutRequestId', paymentController.status);

module.exports = router;
