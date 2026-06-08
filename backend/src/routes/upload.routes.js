// Upload route removed — using Firebase Storage directly from the frontend
const express = require('express');
const router = express.Router();

router.all('*', (req, res) => {
  res.status(410).json({ error: 'Image upload is handled directly via Firebase Storage from the frontend. Remove this route.' });
});

module.exports = router;
