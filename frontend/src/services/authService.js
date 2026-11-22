import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { registerNewUserCount } from './statsService';
import { saveUserContact } from './userContactService';

// Usernames keep the casing the user typed; `usernameLower` is what uniqueness
// checks query so "Baba" and "BABA" cannot both exist.
//
// SECURITY: the public users/{uid} document carries display data only. Email,
// phone and WhatsApp are written to users/{uid}/private/contact, which rules
// expose to the owner and admins only. Writing them here would be rejected by
// firestore.rules (and would leak them to every listing viewer).
export const createUserDocument = async (uid, data) => {
  const username =
    typeof data.username === 'string' && data.username.trim() ? data.username.trim() : null;

  await setDoc(doc(db, 'users', uid), {
    uid,
    displayName: data.displayName || '',
    username,
    usernameLower: username ? username.toLowerCase() : null,
    photoURL: data.photoURL || null,
    role: 'buyer',
    sellerApproved: false,
    sellerDisplayName: null,
    sellerBio: null,
    sellerRating: 0,
    sellerTotalRatings: 0,
    totalSales: 0,
    completedSalesCount: 0,
    totalPurchases: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await saveUserContact(uid, {
    email: data.email || '',
    phoneNumber: data.phoneNumber || '',
    whatsappNumber: data.sellerWhatsapp || '',
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

// SECURITY: profile updates must never carry private contact fields — they
// belong in users/{uid}/private/contact (see userContactService.saveUserContact).
// Privilege/trust fields are stripped too: they are either backend-managed or
// admin-only in firestore.rules, and including one would deny the whole write
// with "Missing or insufficient permissions".
const OWNER_WRITE_BLOCKED_KEYS = [
  'email', 'phoneNumber', 'whatsappNumber', 'sellerWhatsapp', 'sellerPhone',
  'uid', 'role', 'sellerApproved', 'sellerRating', 'sellerTotalRatings',
  'totalSales', 'completedSalesCount', 'totalPurchases', 'statsCounted', 'disabled', 'banned',
  'warnings', 'suspended', 'suspendedAt', 'suspensionReason', 'createdAt',
];

export const updateUserDocument = async (uid, data) => {
  const publicFields = { ...(data || {}) };
  for (const key of OWNER_WRITE_BLOCKED_KEYS) {
    delete publicFields[key];
  }
  await updateDoc(doc(db, 'users', uid), { ...publicFields, updatedAt: serverTimestamp() });
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
  } else if (user.photoURL && !existing.photoURL) {
    await updateUserDocument(user.uid, { photoURL: user.photoURL });
  }
  return result;
};

export const logout = async () => {
  return signOut(auth);
};
