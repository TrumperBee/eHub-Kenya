import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export const createUserDocument = async (uid, data) => {
  await setDoc(doc(db, 'users', uid), {
    uid,
    email: data.email,
    displayName: data.displayName || '',
    username: data.username || null,
    phoneNumber: data.phoneNumber || null,
    photoURL: data.photoURL || null,
    role: 'buyer',
    sellerApproved: false,
    sellerDisplayName: null,
    sellerBio: null,
    sellerWhatsapp: null,
    sellerRating: 0,
    sellerTotalRatings: 0,
    totalSales: 0,
    totalPurchases: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getUserDocument = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
};

export const updateUserDocument = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const registerWithEmail = async (email, password, displayName, username) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await createUserDocument(cred.user.uid, { email, displayName, username: username.toLowerCase() });
  return cred.user;
};

export const loginWithEmail = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const existing = await getUserDocument(user.uid);
  if (!existing) {
    await createUserDocument(user.uid, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  }
  return result;
};

export const logout = async () => {
  return signOut(auth);
};
