import axios from 'axios';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { attachContacts } from './userContactService';
import { sendNotificationSafe } from './notificationService';
import { BACKEND_URL } from '../utils/constants';

export const getUserById = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
};

// SECURITY: no generic "update any user field" helper. Display fields go
// through authService.updateUserDocument (which strips contact fields) and
// contact fields through userContactService.saveUserContact.

export const getAllSellers = async () => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'seller'),
    where('sellerApproved', '==', true)
  );
  const snap = await getDocs(q);
  // SECURITY: admin-only view — merge the owner/admin-only contact document.
  return attachContacts(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
};

export const getPendingApplications = async () => {
  const q = query(
    collection(db, 'sellerApplications'),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllApplications = async () => {
  const q = query(collection(db, 'sellerApplications'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const approveSeller = async (userId) => {
  // SECURITY: the backend owns the approval write so the welcome email can
  // only be sent after both Firestore documents have been updated. It also
  // re-checks the verified admin token before touching either document.
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in');
  const token = await user.getIdToken();
  await axios.post(
    `${BACKEND_URL}/api/admin/sellers/${encodeURIComponent(userId)}/approve`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // SECURITY: Firestore rules forbid writing into another user's notification
  // feed from the browser, so the in-app notice goes through the backend too.
  await sendNotificationSafe({
    userId,
    title: 'Seller Application Approved!',
    message: 'Congratulations! Your seller account is approved. Visit your Transfer Room to start listing.',
    type: 'approval',
  });
};

export const removeSeller = async (userId) => {
  await updateDoc(doc(db, 'users', userId), {
    role: 'buyer',
    sellerApproved: false,
    updatedAt: serverTimestamp(),
  });
  const q = query(collection(db, 'listings'), where('sellerId', '==', userId));
  const snap = await getDocs(q);
  const updates = snap.docs.map(d => updateDoc(doc(db, 'listings', d.id), {
    status: 'paused',
    updatedAt: serverTimestamp(),
  }));
  await Promise.all(updates);
};

export const rejectApplication = async (userId, reason) => {
  await updateDoc(doc(db, 'sellerApplications', userId), {
    status: 'rejected',
    rejectionReason: reason,
    reviewedAt: serverTimestamp(),
  });
};

export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  // SECURITY: admin-only view — merge the owner/admin-only contact document.
  return attachContacts(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
};

export const submitSellerApplication = async (userId, data) => {
  await setDoc(doc(db, 'sellerApplications', userId), {
    userId,
    email: data.email,
    displayName: data.displayName,
    desiredSellerName: data.desiredSellerName,
    bio: data.bio,
    whatsappNumber: data.whatsappNumber,
    status: 'pending',
    submittedAt: serverTimestamp(),
    reviewedAt: null,
    rejectionReason: null,
  });
};

export const getSellerApplication = async (userId) => {
  const snap = await getDoc(doc(db, 'sellerApplications', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};
