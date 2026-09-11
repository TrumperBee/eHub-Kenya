import axios from 'axios';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { BACKEND_URL } from '../utils/constants';

const dropsRef = collection(db, 'fridayDrops');

// Submission is handled by the trusted backend (https://api-drops-submit),
// which computes the binding Friday in East Africa Time server-side and emails
// the seller the Live/Scheduled notification. The drop document is created by
// the backend, never directly by the client.
export const submitDrop = async (data) => {
  const idToken = await auth.currentUser.getIdToken();
  const { data: res } = await axios.post(
    `${BACKEND_URL}/api/drops/submit`,
    data,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  if (!res.success) {
    throw new Error(res.error || 'Failed to submit drop');
  }
  return { id: res.dropId };
};

const mapSnap = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export const subscribeToActiveDrops = (callback, onError) => {
  const q = query(dropsRef, where('status', '==', 'approved'));
  return onSnapshot(q, (snap) => callback(mapSnap(snap)), (err) => onError && onError(err));
};

export const subscribeToSellerDrops = (sellerId, callback, onError) => {
  const q = query(dropsRef, where('sellerId', '==', sellerId));
  return onSnapshot(q, (snap) => callback(mapSnap(snap)), (err) => onError && onError(err));
};

export const subscribeToPendingDrops = (callback, onError) => {
  const q = query(dropsRef, where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => callback(mapSnap(snap)), (err) => onError && onError(err));
};

export const subscribeToAllDrops = (callback, onError) => {
  return onSnapshot(dropsRef, (snap) => callback(mapSnap(snap)), (err) => onError && onError(err));
};

export const getSellerDropForListing = async (sellerId, listingId) => {
  const q = query(dropsRef, where('sellerId', '==', sellerId), where('listingId', '==', listingId));
  const snap = await getDocs(q);
  return mapSnap(snap);
};

export const getDropsForListing = async (listingId) => {
  const q = query(dropsRef, where('listingId', '==', listingId));
  const snap = await getDocs(q);
  return mapSnap(snap);
};

export const setDropStatus = async (dropId, data) => {
  return updateDoc(doc(db, 'fridayDrops', dropId), {
    ...data,
    reviewedAt: serverTimestamp(),
  });
};

export const approveDrop = async (dropId) => setDropStatus(dropId, { status: 'approved' });

export const rejectDrop = async (dropId, reason) =>
  setDropStatus(dropId, { status: 'rejected', rejectionReason: reason || '' });

export const expireDrop = async (dropId) => setDropStatus(dropId, { status: 'expired' });

export const incrementDropViews = async (dropId) =>
  updateDoc(doc(db, 'fridayDrops', dropId), { views: increment(1) });