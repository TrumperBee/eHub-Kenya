import axios from 'axios';
import { auth } from './firebase';
import { BACKEND_URL } from '../utils/constants';

const api = axios.create({ baseURL: BACKEND_URL });

/**
 * Submit or update a verified-purchase review for a seller.
 * Provide either orderId (preferred) or sellerId; the backend validates that
 * the signed-in buyer has a completed order before writing the review.
 */
export const submitSellerReview = async ({ orderId, sellerId, rating, comment }) => {
  const idToken = await auth.currentUser.getIdToken();
  const { data } = await api.post(
    '/api/reviews',
    { orderId, sellerId, rating, comment },
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  return data;
};
