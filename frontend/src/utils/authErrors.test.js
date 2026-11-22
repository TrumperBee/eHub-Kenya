import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GOOGLE_ONLY_LOGIN_MESSAGE,
  GOOGLE_ONLY_RESET_MESSAGE,
  isGoogleOnlyAccountError,
  setPasswordErrorMessage,
  changePasswordErrorMessage,
  loginErrorMessage,
} from './authErrors.js';

test('Google-only detection covers the credential codes Firebase may return', () => {
  for (const code of [
    'auth/wrong-password',
    'auth/user-not-found',
    'auth/invalid-credential',
  ]) {
    assert.equal(isGoogleOnlyAccountError({ code }), true, code);
  }
});

test('Google-only detection also reads the raw Firebase message', () => {
  assert.equal(isGoogleOnlyAccountError({ message: 'PASSWORD_NOT_CONFIGURED' }), true);
  assert.equal(isGoogleOnlyAccountError({ message: 'This account has no password provider' }), true);
});

test('ordinary auth errors are not treated as Google-only', () => {
  assert.equal(isGoogleOnlyAccountError({ code: 'auth/network-request-failed' }), false);
  assert.equal(isGoogleOnlyAccountError({ code: 'auth/too-many-requests' }), false);
  assert.equal(isGoogleOnlyAccountError(null), false);
});

test('login and reset messages tell Google users exactly what to do', () => {
  assert.equal(
    GOOGLE_ONLY_LOGIN_MESSAGE,
    "This email is registered with Google Sign-In. Please use the 'Sign in with Google' button, or set a password first in Account Settings."
  );
  assert.equal(
    GOOGLE_ONLY_RESET_MESSAGE,
    "This account uses Google Sign-In and doesn't have a password yet. Sign in with Google, then go to Account Settings to add a password."
  );
});

test('password setup failures are shown as plain English, never raw Firebase text', () => {
  assert.ok(setPasswordErrorMessage({ code: 'auth/weak-password' }).startsWith('That password is too weak'));
  assert.ok(setPasswordErrorMessage({ code: 'auth/requires-recent-login' }).includes('sign in with Google again'));
  assert.ok(setPasswordErrorMessage({ code: 'auth/email-already-in-use' }).includes('another account'));
  assert.ok(setPasswordErrorMessage({ code: 'auth/network-request-failed' }).startsWith('Network error'));
  assert.ok(!setPasswordErrorMessage({ code: 'auth/weak-password' }).includes('auth/'));
});

test('password change failures distinguish a wrong current password', () => {
  assert.equal(changePasswordErrorMessage({ code: 'auth/wrong-password' }), 'Current password is incorrect.');
  assert.equal(changePasswordErrorMessage({ code: 'auth/invalid-credential' }), 'Current password is incorrect.');
  assert.ok(changePasswordErrorMessage({ code: 'auth/weak-password' }).startsWith('New password is too weak'));
});

test('regular credential errors keep their existing login message', () => {
  assert.equal(loginErrorMessage({ code: 'auth/invalid-credential' }), 'Incorrect email or password.');
});
