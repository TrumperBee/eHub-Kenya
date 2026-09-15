import { db } from './firebase';
import { collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';

export const getUserById = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
};

export const updateUserProfile = async (uid, data) => {
  return updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const getAllSellers = async () => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'seller'),
    where('sellerApproved', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
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
  await updateDoc(doc(db, 'users', userId), {
    role: 'seller',
    sellerApproved: true,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'sellerApplications', userId), {
    status: 'approved',
    reviewedAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'notifications'), {
    userId,
    title: 'Seller Application Approved!',
    message: 'Congratulations! Your seller account is approved. Visit your Transfer Room to start listing.',
    type: 'approval',
    orderId: null,
    read: false,
    createdAt: serverTimestamp(),
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
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
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
