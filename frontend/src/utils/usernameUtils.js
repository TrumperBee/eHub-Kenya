// IMPORTANT: Ensure Firestore has an index on users.username (ascending)
// Firebase console → Firestore → Indexes → Single field → users → username

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export const validateUsernameFormat = (username) => {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be 20 characters or less';
  if (!/^[a-z0-9_]+$/.test(username))
    return 'Only lowercase letters, numbers, and underscores allowed';
  if (username.startsWith('_') || username.endsWith('_'))
    return 'Username cannot start or end with an underscore';
  return null;
};

export const isUsernameTaken = async (username) => {
  const q = query(
    collection(db, 'users'),
    where('username', '==', username.toLowerCase())
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

export const checkUsername = async (username) => {
  const formatError = validateUsernameFormat(username);
  if (formatError) return { valid: false, error: formatError };
  const taken = await isUsernameTaken(username);
  if (taken) return { valid: false, error: 'taken' };
  return { valid: true, error: null };
};

export const generateSuggestions = (base) => {
  const clean = base.replace(/[^a-z0-9]/g, '');
  const year = new Date().getFullYear().toString().slice(-2);
  return [
    `${clean}${year}`,
    `${clean}_ke`,
    `${clean}254`,
    `the_${clean}`,
  ].slice(0, 4);
};
