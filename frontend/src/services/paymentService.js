import axios from 'axios';
import { BACKEND_URL } from '../utils/constants';
import { auth } from './firebase';

const api = axios.create({ baseURL: BACKEND_URL });

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
  const token = await auth.currentUser?.getIdToken();
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));
  const { data } = await api.post('/api/upload/listing-images', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const deleteListingImage = async (fileName) => {
  const token = await auth.currentUser?.getIdToken();
  const { data } = await api.delete('/api/upload/listing-image', {
    headers: { Authorization: `Bearer ${token}` },
    data: { fileName },
  });
  return data;
};
