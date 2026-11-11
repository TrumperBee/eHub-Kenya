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

export function loginErrorMessage(err) {
  const code = err?.code || '';
  return LOGIN_MESSAGES[code] || 'Login failed. Check your email and password and try again.';
}

export function googleAuthErrorMessage(err) {
  const code = err?.code || '';
  return GOOGLE_MESSAGES[code] || 'Google sign-in failed. Please use email and password.';
}
