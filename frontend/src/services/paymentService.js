import axios from 'axios';
import { BACKEND_URL } from '../utils/constants';
import { auth } from './firebase';

const api = axios.create({ baseURL: BACKEND_URL });

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const generateOrderId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'OD';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const initiatePayment = async ({ phone, amount, orderId, listingId, listingTitle }) => {
  const token = await auth.currentUser?.getIdToken();
  const { data } = await api.post('/api/payment/initiate', {
    phone,
    amount,
    orderId,
    listingId,
    listingTitle,
  }, { headers: { Authorization: `Bearer ${token}` } });
  return data;
};

export const pollPaymentStatus = async (checkoutRequestId, maxAttempts = 12) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const { data } = await api.get(`/api/payment/status/${checkoutRequestId}`);
      if (data.status === 'success' || data.status === 'failed') {
        return { status: data.status, mpesaReceiptNumber: data.mpesaReceiptNumber };
      }
    } catch {
      // continue polling
    }
  }
  return { status: 'timeout', mpesaReceiptNumber: null };
};

export const initiateMpesaPayment = async (phone, amount, orderId, listingTitle) => {
  const token = await auth.currentUser?.getIdToken();
  const { data } = await api.post('/api/payment/initiate', {
    phone,
    amount,
    orderId,
    listingTitle,
  }, { headers: { Authorization: `Bearer ${token}` } });
  return data;
};

export const checkPaymentStatus = async (checkoutRequestId) => {
  const { data } = await api.get(`/api/payment/status/${checkoutRequestId}`);
  return data;
};

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
      throw new Error(err.error?.message || `Image upload failed (status ${res.status}). Try smaller images or try again.`);
    }

    const data = await res.json();
    urls.push(data.secure_url);
  }

  return { urls };
};

export const deleteListingImage = async () => {
  // Cloudinary unsigned uploads can't be deleted via API without a secret.
  // Old images will be cleaned up automatically or via Cloudinary dashboard.
};
