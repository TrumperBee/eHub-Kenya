const multer = require('multer');
const cloudflareService = require('../services/cloudflareService');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
});

async function uploadImages(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = await cloudflareService.uploadImages(req.files);
    const urls = results.map(r => r.url);

    res.json({ success: true, urls });
  } catch (err) {
    next(err);
  }
}

async function deleteImage(req, res, next) {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }
    await cloudflareService.deleteImage(fileName);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadImages, deleteImage };
