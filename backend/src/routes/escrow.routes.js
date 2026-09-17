const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const escrowController = require('../controllers/escrowController');

router.post('/release', verifyFirebaseToken, escrowController.release);
router.post('/dispute', verifyFirebaseToken, escrowController.dispute);
router.post('/delivery', verifyFirebaseToken, escrowController.submitDelivery);
router.post('/credentials/reveal', verifyFirebaseToken, escrowController.revealCredentials);
router.post('/resolve', verifyFirebaseToken, escrowController.resolve);
router.post('/release-matured', verifyFirebaseToken, escrowController.releaseMatured);

module.exports = router;
