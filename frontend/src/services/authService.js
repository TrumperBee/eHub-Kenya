import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { registerNewUserCount } from './statsService';

// Usernames keep the casing the user typed; `usernameLower` is what uniqueness
// checks query so "Baba" and "BABA" cannot both exist.
export const createUserDocument = async (uid, data) => {
  const username =
    typeof data.username === 'string' && data.username.trim() ? data.username.trim() : null;

  await setDoc(doc(db, 'users', uid), {
    uid,
    email: data.email,
    displayName: data.displayName || '',
    username,
    usernameLower: username ? username.toLowerCase() : null,
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
  // One-time, idempotent community-size bump (guarded by the statsCounted flag
  // in the same user doc). Never blocks signup if the stats write fails — the
  // backend reconciliation recomputes totalUsers from the users collection.
  registerNewUserCount(uid).catch(() => {});
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
  await createUserDocument(cred.user.uid, { email, displayName, username });
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
