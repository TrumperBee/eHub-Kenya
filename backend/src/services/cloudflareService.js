const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const R2_ENDPOINT = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'efootball-hub-images';
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function uploadImage(fileBuffer, originalName, contentType) {
  const ext = path.extname(originalName) || '.jpg';
  const fileName = `${uuidv4()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
  }));

  const url = PUBLIC_URL ? `${PUBLIC_URL}/${fileName}` : `${R2_ENDPOINT}/${BUCKET}/${fileName}`;
  return { url, fileName };
}

async function deleteImage(fileName) {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: fileName,
  }));
}

async function uploadImages(files) {
  const results = [];
  for (const file of files) {
    const result = await uploadImage(file.buffer, file.originalname, file.mimetype);
    results.push(result);
  }
  return results;
}

module.exports = { uploadImage, deleteImage, uploadImages };
