const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const escrowController = require('../controllers/escrowController');

router.post('/release', verifyFirebaseToken, escrowController.release);
router.post('/dispute', verifyFirebaseToken, escrowController.dispute);

module.exports = router;
