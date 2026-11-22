// Maps Firebase Auth errors to messages users can actually act on.
// Raw Firebase text (e.g. "Firebase: Error (auth/invalid-credential).")
// should never be shown in the UI.

const LOGIN_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Contact support.',
};

const GOOGLE_MESSAGES = {
  'auth/unauthorized-domain': 'Google sign-in is not available on this domain yet. Please use email and password.',
  'auth/operation-not-allowed': 'Google sign-in is not enabled. Please use email and password.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and try again.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method. Use email and password.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
};

export const GOOGLE_ONLY_LOGIN_MESSAGE =
  "This email is registered with Google Sign-In. Please use the 'Sign in with Google' " +
  'button, or set a password first in Account Settings.';

export const GOOGLE_ONLY_RESET_MESSAGE =
  "This account uses Google Sign-In and doesn't have a password yet. Sign in with Google, " +
  'then go to Account Settings to add a password.';

// Firebase has no stable error code for "this account has no password provider":
// with email enumeration protection enabled it reports auth/invalid-credential
// or auth/user-not-found, and some SDK versions put PASSWORD_NOT_CONFIGURED
// (or "no password") in the message instead. Check both signals.
const GOOGLE_ONLY_CODES = new Set([
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
  'auth/no-password',
]);

export function isGoogleOnlyAccountError(err) {
  const code = err?.code || '';
  const message = String(err?.message || '');
  return GOOGLE_ONLY_CODES.has(code)
    || message.includes('PASSWORD_NOT_CONFIGURED')
    || /no password/i.test(message);
}

const SET_PASSWORD_MESSAGES = {
  'auth/weak-password': 'That password is too weak. Use at least 8 characters with a mix of letters and numbers.',
  'auth/requires-recent-login': 'For security, sign out and sign in with Google again, then set your password.',
  'auth/email-already-in-use': 'That email already belongs to another account. Contact support for help.',
  'auth/credential-already-in-use': 'That email already belongs to another account. Contact support for help.',
  'auth/provider-already-linked': 'A password is already linked. You can log in with email and password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Contact support.',
};

const CHANGE_PASSWORD_MESSAGES = {
  'auth/wrong-password': 'Current password is incorrect.',
  'auth/invalid-credential': 'Current password is incorrect.',
  'auth/user-not-found': 'Current password is incorrect.',
  'auth/weak-password': 'New password is too weak. Use at least 8 characters.',
  'auth/requires-recent-login': 'For security, sign out and sign in again, then change your password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

export function setPasswordErrorMessage(err) {
  const code = err?.code || '';
  return SET_PASSWORD_MESSAGES[code] || 'Could not set a password. Please try again.';
}

export function changePasswordErrorMessage(err) {
  const code = err?.code || '';
  return CHANGE_PASSWORD_MESSAGES[code] || 'Could not update your password. Please try again.';
}

export function loginErrorMessage(err) {
  const code = err?.code || '';
  return LOGIN_MESSAGES[code] || 'Login failed. Check your email and password and try again.';
}

export function googleAuthErrorMessage(err) {
  const code = err?.code || '';
  return GOOGLE_MESSAGES[code] || 'Google sign-in failed. Please use email and password.';
}
