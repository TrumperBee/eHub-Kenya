// eHub Kenya — overdue credential-submission policy (pure).
//
// Firestore-free, auth-free, clock-free: every rule here takes an order-like
// object plus the current time and returns a decision. The sweep service does
// the I/O, so the policy can be unit-tested without Firebase credentials.
//
// Timeline for an order that sits in `awaiting_seller_delivery`:
//   paidAt + 5h   -> one reminder (push + in-app + email), never repeated
//   paidAt + 24h  -> escalate: increment the seller's `warnings`, show the red
//                    banner on the order, and auto-suspend at MAX_WARNINGS
//
// `paidAt` is the authoritative clock. Legacy orders without it fall back to
// `createdAt`, which can only make the warning earlier than the true payment —
// never later.

const HOUR = 60 * 60 * 1000;

const REMINDER_AFTER_MS = 5 * HOUR;
const FLAG_AFTER_MS = 24 * HOUR;
const MAX_WARNINGS = 3;

function toMillis(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/** When the 5h/24h clocks start: paidAt, else createdAt. */
function overdueClockMs(order) {
  return toMillis(order?.paidAt) ?? toMillis(order?.createdAt);
}

/** Milliseconds the seller has had the paid order, or null when unknown. */
function overdueAgeMs(order, nowMs) {
  const start = overdueClockMs(order);
  if (start == null || !Number.isFinite(nowMs)) return null;
  return nowMs - start;
}

/**
 * What the sweep should do for this order right now.
 *
 * @returns {'none'|'reminder'|'flag'}
 *   none      — not overdue, already handled, or no longer awaiting delivery
 *   reminder  — between 5h and 24h and the reminder has not been sent
 *   flag      — 24h+ and the seller has not been flagged for this order
 */
function overdueStage(order, nowMs) {
  if (!order) return 'none';
  if (order.status !== 'awaiting_seller_delivery') return 'none';

  // The 24h escalation is recorded on the order as an idempotency guard.
  if (order.sellerOverdueFlaggedAt) return 'none';

  const age = overdueAgeMs(order, nowMs);
  if (age == null) return 'none';

  if (age >= FLAG_AFTER_MS) return 'flag';
  if (age >= REMINDER_AFTER_MS) {
    return order.sellerOverdueReminderSentAt ? 'none' : 'reminder';
  }
  return 'none';
}

/**
 * Seller state after one flag. A suspended seller is never suspended twice and
 * the warning counter stops at the threshold so the UI cannot show 4/3 or 47.
 *
 * @param {{ warnings?: number|string, suspended?: boolean }} userData
 * @returns {{ warningCount: number, suspended: boolean, newlySuspended: boolean }}
 */
function nextSellerState(userData = {}, { maxWarnings = MAX_WARNINGS } = {}) {
  const parsed = Math.floor(Number(userData?.warnings));
  const previous = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const alreadySuspended = userData?.suspended === true;
  const warningCount = Math.min(previous + 1, maxWarnings);
  const suspended = alreadySuspended || warningCount >= maxWarnings;

  return {
    warningCount,
    suspended,
    newlySuspended: suspended && !alreadySuspended,
  };
}

module.exports = {
  REMINDER_AFTER_MS,
  FLAG_AFTER_MS,
  MAX_WARNINGS,
  toMillis,
  overdueClockMs,
  overdueAgeMs,
  overdueStage,
  nextSellerState,
};
