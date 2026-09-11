const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const emailController = require('../controllers/emailController');

router.post('/test', verifyFirebaseToken, emailController.sendTest);

module.exports = router;