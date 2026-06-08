import axios from 'axios';
import { BACKEND_URL } from '../utils/constants';
import { auth, storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

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
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in to upload images');

  const urls = [];
  for (const file of files) {
    const fileName = `listings/${user.uid}/${crypto.randomUUID()}${file.name.substring(file.name.lastIndexOf('.'))}`;
    const storageRef = ref(storage, fileName);
    const snapshot = await uploadBytesResumable(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    urls.push(url);
  }
  return { urls };
};

export const deleteListingImage = async (imageUrl) => {
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (err) {
    console.error('Delete image error:', err);
  }
};
