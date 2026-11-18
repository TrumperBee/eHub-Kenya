// Admin order actions.
//
// SECURITY: orders are written exclusively by the backend (see firestore.rules).
// The admin console calls these endpoints instead of mutating Firestore from
// the browser, so a compromised admin session still cannot forge arbitrary
// order fields — it can only perform the two audited operations below.

import axios from 'axios';
import { auth } from './firebase';
import { BACKEND_URL } from '../utils/constants';

const authHeaders = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
};

/** Record a manual seller payout for a completed order. */
export const markSellerPayoutPaid = async (orderId) => {
  const { data } = await axios.post(
    `${BACKEND_URL}/api/admin/orders/${orderId}/payout-paid`,
    {},
    { headers: await authHeaders() }
  );
  return data;
};

/** Flag a disputed order as picked up by an admin. */
export const markDisputeUnderReview = async (orderId) => {
  const { data } = await axios.post(
    `${BACKEND_URL}/api/admin/orders/${orderId}/under-review`,
    {},
    { headers: await authHeaders() }
  );
  return data;
};
