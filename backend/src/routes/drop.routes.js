const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifySeller } = require('../middleware/verifyFirebaseToken');
const dropController = require('../controllers/dropController');

router.post('/submit', verifyFirebaseToken, verifySeller, dropController.submitDrop);

module.exports = router;