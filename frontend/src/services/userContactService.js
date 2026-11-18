// Private contact details (email, phone, WhatsApp).
//
// SECURITY: these fields must never live on the publicly readable users/{uid}
// document. They are stored at users/{uid}/private/contact, which Firestore
// rules expose to the owner and admins only. Order participants get a snapshot
// written onto the order by the backend at payment time.
//
// Callers must treat a missing contact document as "unknown" — older accounts
// are backfilled by backend/scripts/migratePrivateUserFields.js.

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const CONTACT_PATH = ['private', 'contact'];

export const contactRef = (uid) => doc(db, 'users', uid, ...CONTACT_PATH);

/**
 * Read the private contact document. Returns `{}` when it does not exist so
 * callers can merge without null checks.
 */
export const getUserContact = async (uid) => {
  if (!uid) return {};
  try {
    const snap = await getDoc(contactRef(uid));
    return snap.exists() ? snap.data() : {};
  } catch (err) {
    console.warn('Private contact lookup failed:', err?.code || err?.message);
    return {};
  }
};

/**
 * Merge contact fields into a public profile object using the same names the
 * rest of the UI already reads (phoneNumber, email, sellerWhatsapp).
 */
export const mergeContactIntoProfile = (profile, contact = {}) => {
  if (!profile) return profile;
  return {
    ...profile,
    email: contact.email || profile.email || '',
    phoneNumber: contact.phoneNumber || profile.phoneNumber || '',
    sellerWhatsapp:
      contact.whatsappNumber || contact.sellerWhatsapp || profile.sellerWhatsapp || '',
  };
};

/** Convenience: public profile + private contact in one object. */
export const getUserWithContact = async (uid) => {
  if (!uid) return null;
  const [snap, contact] = await Promise.all([getDoc(doc(db, 'users', uid)), getUserContact(uid)]);
  if (!snap.exists()) return null;
  return mergeContactIntoProfile({ uid: snap.id, ...snap.data() }, contact);
};

/**
 * Write contact fields for the signed-in user. Only known keys are persisted.
 */
export const saveUserContact = async (uid, data = {}) => {
  const payload = {
    ...(typeof data.email === 'string' ? { email: data.email.trim() } : {}),
    ...(data.phoneNumber !== undefined
      ? { phoneNumber: data.phoneNumber ? String(data.phoneNumber).trim() : null }
      : {}),
    ...(data.whatsappNumber !== undefined
      ? { whatsappNumber: data.whatsappNumber ? String(data.whatsappNumber).trim() : null }
      : {}),
    updatedAt: serverTimestamp(),
  };
  await setDoc(contactRef(uid), payload, { merge: true });
};

/** Attach private contact data to a list of users (admin views only). */
export const attachContacts = async (users = []) => {
  const contacts = await Promise.all(users.map((u) => getUserContact(u.uid || u.id)));
  return users.map((u, i) => mergeContactIntoProfile(u, contacts[i]));
};
