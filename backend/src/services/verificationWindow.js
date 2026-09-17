"use strict";

// eHub Kenya — Phase 4: 30-minute buyer verification window — SERVICE.
//
// Pure, Firestore-free, auth-free, clock-free arithmetic describing the Phase-4
// verification window. It centralises ONE constant (exactly 30 minutes) so the
// backend controller/route that REPORTS the window and the frontend display
// countdown share a single source of truth.
//
// SCOPE GUARD (Phase-4 contract): this service ONLY derives display/status
// strings about the verification window. It does NOT and must NOT decide escrow
// release, completion, auto-payout, or any financial outcome — that is Phase 5
// and is explicitly out of scope hereasiest (see README roadmap). Nothing in
// this file reads or writes Firestore, touches `order.status`/`escrowStatus`,
// or accepts a client-supplied clock/timestamp.
const VERIFICATION_WINDOW_MS = 30 * 60 * 1000; // exactly 30:00

// Deadline is reveal + exactly 30 minutes — immutable, never extended, never
// restarted by a refresh/re-reveal. Pure function of the reveal instant.
function verificationDeadlineAfter(credentialsRevealedAtMs) {
  return credentialsRevealedAtMs + VERIFICATION_WINDOW_MS;
}

// Status computed against the server clock at `nowMs`:
//   'not_started' — credentials never revealed (no window started).
//   'active'      — a reveal exists and nowMs is strictly before the deadline.
//   'expired'     — nowMs >= deadline (the 30:00 passed; status never reverts).
// This is the ONLY function Phase-4 UI should use to decide what to display.
function verificationStatusAt({ credentialsRevealedAt, verificationDeadline }, nowMs) {
  if (!credentialsRevealedAt || !verificationDeadline) return 'not_started';
  return nowMs >= verificationDeadline ? 'expired' : 'active';
}

// Display-only remaining milliseconds (never authoritative). Used purely to
// render a countdown on the frontend; clamped at 0 so the UI never shows a
// negative value after the deadline.
function remainingMsAt(verificationDeadline, nowMs) {
  if (!verificationDeadline) return 0;
  const remaining = verificationDeadline - nowMs;
  return remaining > 0 ? remaining : 0;
}

module.exports = {
  VERIFICATION_WINDOW_MS,
  verificationDeadlineAfter,
  verificationStatusAt,
  remainingMsAt,
};
