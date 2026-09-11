import axios from 'axios';
import { auth } from './firebase';
import { BACKEND_URL } from '../utils/constants';

const api = axios.create({ baseURL: BACKEND_URL });

export const initializePaystackPayment = async ({ listingId, amount }) => {
  const idToken = await auth.currentUser.getIdToken();
  const buyerEmail = auth.currentUser.email;
  const { data } = await api.post(
    '/api/payment/initialize',
    { listingId, buyerEmail, amount },
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  return data;
};

export const cancelPayment = async (orderId) => {
  const idToken = await auth.currentUser.getIdToken();
  const { data } = await api.post(
    '/api/payment/cancel',
    { orderId },
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  return data;
};

export const releaseEscrow = async (orderId) => {
  const idToken = await auth.currentUser.getIdToken();
  const { data } = await api.post(
    '/api/escrow/release',
    { orderId },
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  return data;
};

export const submitDelivery = async (orderId, { accountEmail, accountPassword }) => {
  const idToken = await auth.currentUser.getIdToken();
  const { data } = await api.post(
    '/api/escrow/delivery',
    { orderId, accountEmail, accountPassword },
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  return data;
};

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadListingImages = async (files) => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Image upload is not configured. Contact the admin to set up Cloudinary.');
  }

  const urls = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const reason = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`Image upload failed: ${reason}. Make sure the Cloudinary upload preset "${UPLOAD_PRESET}" is set to "Unsigned" in Cloudinary Settings > Upload > Upload presets.`);
    }

    const data = await res.json();
    urls.push(data.secure_url);
  }

  return { urls };
};

export const deleteListingImage = async () => {
  // Cloudinary unsigned uploads can't be deleted via API without a secret.
};
