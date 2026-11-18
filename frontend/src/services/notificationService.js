// Cross-user notifications.
//
// SECURITY: Firestore rules only allow a user to create a notification for
// themselves. Mentions, replies and admin announcements therefore go through
// POST /api/notifications, which verifies the sender, checks the recipient
// exists and sanitises the payload.

import axios from 'axios';
import { auth } from './firebase';
import { BACKEND_URL } from '../utils/constants';

/**
 * Send a notification to another user.
 *
 * @param {object} payload
 * @param {string} payload.userId  recipient uid
 * @param {string} payload.title
 * @param {string} payload.message
 * @param {string} [payload.type]  mention | reply | comment | order | listing | drop | system | announcement
 * @param {string} [payload.listingId]
 * @param {string} [payload.link]  in-app relative path, e.g. /listings/abc
 */
export const sendNotification = async (payload) => {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in');

  const token = await user.getIdToken();
  const { data } = await axios.post(`${BACKEND_URL}/api/notifications`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

/**
 * Best-effort variant for non-critical UI paths (a failed mention notification
 * must never break posting the comment itself).
 */
export const sendNotificationSafe = async (payload) => {
  try {
    return await sendNotification(payload);
  } catch (err) {
    console.warn('Notification delivery failed:', err?.response?.data?.error || err?.message);
    return null;
  }
};
