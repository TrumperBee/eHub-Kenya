// IMPORTANT: Ensure Firestore has an index on users.usernameLower (ascending).
// Firebase console > Firestore > Indexes > Single field > users > usernameLower

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

// Letters (any case), numbers, underscore and hyphen. Capitals are preserved as
// typed — `username` keeps the original casing and `usernameLower` is only used
// for case-insensitive uniqueness checks.
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;

export const normalizeUsernameLower = (username) =>
  String(username || '').trim().toLowerCase();

/**
 * Value persisted to users/{uid}.username.
 *
 * Firestore rules reject an empty-string username (it is neither null nor a
 * valid 3–20 character name), which used to deny profile saves for legacy and
 * Google accounts that have no username yet. `null` is the rules' explicit
 * "unset" value, so normalise empty input to null instead of ''.
 */
export const normalizeUsernameForWrite = (username) => {
  const cleaned = String(username || '').trim();
  return cleaned || null;
};

export const validateUsernameFormat = (username) => {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be 20 characters or less';
  if (!USERNAME_PATTERN.test(username))
    return 'Only letters, numbers, underscores and hyphens allowed';
  if (username.startsWith('_') || username.endsWith('_'))
    return 'Username cannot start or end with an underscore';
  return null;
};

/**
 * Case-insensitive availability check.
 *
 * New accounts store `usernameLower`, so that is queried first. Legacy accounts
 * (created before this field existed) stored their username already lowercased,
 * so `username == lower` is also checked — that keeps existing names protected
 * without rewriting anybody's display name.
 */
export const isUsernameTaken = async (username) => {
  const lower = normalizeUsernameLower(username);
  if (!lower) return false;

  const users = collection(db, 'users');
  const [byLower, byLegacy] = await Promise.all([
    getDocs(query(users, where('usernameLower', '==', lower))),
    getDocs(query(users, where('username', '==', lower))),
  ]);

  return !byLower.empty || !byLegacy.empty;
};

export const checkUsername = async (username) => {
  const formatError = validateUsernameFormat(username);
  if (formatError) return { valid: false, error: formatError };
  const taken = await isUsernameTaken(username);
  if (taken) return { valid: false, error: 'taken' };
  return { valid: true, error: null };
};

export const generateSuggestions = (base) => {
  // Suggestions are always lowercase so they are safe to use as-is.
  const clean = String(base || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const year = new Date().getFullYear().toString().slice(-2);
  return [
    `${clean}${year}`,
    `${clean}_ke`,
    `${clean}254`,
    `the_${clean}`,
  ].slice(0, 4);
};
