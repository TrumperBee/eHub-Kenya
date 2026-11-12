"use strict";

// eHub Kenya - 30-minute buyer verification window - SERVICE.
//
// Pure, Firestore-free, auth-free, clock-free arithmetic describing the buyer
// verification window. It centralises ONE constant (exactly 30 minutes) so the
// backend controller/route that REPORTS the window, the auto-release worker and
// the frontend display countdown share a single source of truth.
//
// TRIGGER CONTRACT: the window starts ONLY on the buyer's first "Show Password"
// click, i.e. the server writes `verificationStartedAt` on the order at that
// moment. It never starts at payment confirmation (`paidAt`) and is never
// restarted or extended by a refresh or a re-reveal.
//
// `credentialsRevealedAt` is kept as the legacy alias of the same instant so
// older orders and older clients keep working. `verificationDeadline` is always
// derived from the start instant + exactly 30 minutes.
const VERIFICATION_WINDOW_MS = 30 * 60 * 1000; // exactly 30:00

const toMillis = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

// Deadline is start + exactly 30 minutes - immutable, never extended, never
// restarted by a refresh/re-reveal. Pure function of the start instant.
function verificationDeadlineAfter(startedAtMs) {
  return startedAtMs + VERIFICATION_WINDOW_MS;
}

// Resolve the authoritative start instant from an order-like object.
//   1. `verificationStartedAt` - the current field written on first reveal.
//   2. `credentialsRevealedAt` - legacy alias of the same instant.
//   3. `verificationDeadline - 30 min` - legacy orders with a deadline only.
// Returns null when the buyer has never revealed the password, which is the
// signal that NO countdown should run and escrow must not auto-release.
function verificationStartMs(order) {
  if (!order) return null;
  const explicit = toMillis(order.verificationStartedAt) ?? toMillis(order.credentialsRevealedAt);
  if (explicit != null) return explicit;
  const deadline = toMillis(order.verificationDeadline);
  return deadline != null ? deadline - VERIFICATION_WINDOW_MS : null;
}

// Resolve the deadline from an order-like object. Prefers the stored deadline,
// otherwise derives it from the start instant. Returns null when not started.
function verificationDeadlineMs(order) {
  if (!order) return null;
  const stored = toMillis(order.verificationDeadline);
  const started = verificationStartMs(order);
  const derived = started != null ? verificationDeadlineAfter(started) : null;
  if (stored == null) return derived;
  // Never release earlier than start + 30 minutes, even if a legacy document
  // stored a shorter deadline.
  return derived == null ? stored : Math.max(stored, derived);
}

// Status computed against the server clock at `nowMs`:
//   'not_started' - the buyer never revealed the password (no window started).
//   'active'      - the window started and nowMs is strictly before the deadline.
//   'expired'     - nowMs >= deadline (the 30:00 passed; status never reverts).
// This is the ONLY function the UI/worker should use to decide what to do.
function verificationStatusAt(orderLike, nowMs) {
  const deadline = verificationDeadlineMs(orderLike);
  if (deadline == null) return 'not_started';
  return nowMs >= deadline ? 'expired' : 'active';
}

// Display-only remaining milliseconds (never authoritative). Used purely to
// render a countdown on the frontend; clamped at 0 so the UI never shows a
// negative value after the deadline.
function remainingMsAt(deadline, nowMs) {
  if (deadline == null) return 0;
  const remaining = deadline - nowMs;
  return remaining > 0 ? remaining : 0;
}

module.exports = {
  VERIFICATION_WINDOW_MS,
  verificationDeadlineAfter,
  verificationStartMs,
  verificationDeadlineMs,
  verificationStatusAt,
  remainingMsAt,
};
