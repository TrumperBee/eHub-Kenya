"use strict";

// eHub Kenya — Phase 4: 30-minute buyer verification window — focused logic
// tests (backend). Mirrors the frontend `node --test` convention; the backend
// has no configured runner, so this pure-Firestore-free service module is
// exercised with node's built-in runner the same way the frontend util tests
// are (see frontend/package.json test script).
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  VERIFICATION_WINDOW_MS,
  verificationDeadlineAfter,
  verificationStatusAt,
  remainingMsAt,
} = require('../src/services/verificationWindow');

// Fixed reference so assertions never depend on the real clock.
const T0 = 1_700_000_000_000;

test('window is exactly 30 minutes', () => {
  assert.equal(VERIFICATION_WINDOW_MS, 30 * 60 * 1000);
});

test('deadline is reveal + exactly 30 minutes', () => {
  assert.equal(verificationDeadlineAfter(T0), T0 + 30 * 60 * 1000);
});

test('status is not_started before any reveal', () => {
  assert.equal(verificationStatusAt({}, T0), 'not_started');
});

test('status is active inside the window (at reveal and just before deadline)', () => {
  const deadline = verificationDeadlineAfter(T0);
  assert.equal(verificationStatusAt({ credentialsRevealedAt: T0, verificationDeadline: deadline }, T0), 'active');
  assert.equal(verificationStatusAt({ credentialsRevealedAt: T0, verificationDeadline: deadline }, deadline - 1), 'active');
});

test('status is expired exactly at the deadline (30:00 passed) — never extended', () => {
  const deadline = verificationDeadlineAfter(T0);
  assert.equal(verificationStatusAt({ credentialsRevealedAt: T0, verificationDeadline: deadline }, deadline), 'expired');
});

test('status stays expired long after the deadline', () => {
  const deadline = verificationDeadlineAfter(T0);
  assert.equal(verificationStatusAt({ credentialsRevealedAt: T0, verificationDeadline: deadline }, deadline + 60_000), 'expired');
});

test('remainingMsAt is display-only and clamps at 0', () => {
  const deadline = verificationDeadlineAfter(T0);
  assert.equal(remainingMsAt(deadline, T0), 30 * 60 * 1000);
  assert.equal(remainingMsAt(deadline, T0 + 1000), 30 * 60 * 1000 - 1000);
  assert.equal(remainingMsAt(deadline, deadline + 1), 0); // clamped, never negative
});
