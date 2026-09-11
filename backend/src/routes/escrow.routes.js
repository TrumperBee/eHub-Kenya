const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const escrowController = require('../controllers/escrowController');

router.post('/release', verifyFirebaseToken, escrowController.release);
router.post('/dispute', verifyFirebaseToken, escrowController.dispute);
router.post('/delivery', verifyFirebaseToken, escrowController.submitDelivery);
router.post('/resolve', verifyFirebaseToken, escrowController.resolve);

module.exports = router;
