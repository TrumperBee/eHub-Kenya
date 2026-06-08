const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifySeller } = require('../middleware/verifyFirebaseToken');
const { upload, uploadImages, deleteImage } = require('../controllers/uploadController');

router.post('/listing-images',
  verifyFirebaseToken,
  verifySeller,
  upload.array('photos', 5),
  uploadImages
);

router.delete('/listing-image',
  verifyFirebaseToken,
  verifySeller,
  deleteImage
);

module.exports = router;
