// eHub Kenya — SINGLE SOURCE OF TRUTH for order statuses (frontend).
//
// There are exactly SEVEN canonical order states. Status is the only field that
// drives the UI; paymentStatus / escrowStatus / disputeStatus are supporting
// fields that must be consistent with the state — never a parallel "second truth"
// the UI invents on its own.
//
//   pending_payment          — created, awaiting buyer payment (paymentStatus pending)
//   awaiting_seller_delivery — paid, escrow HELD, seller must submit account details
//   credentials_submitted    — paid, escrow HELD, seller delivered, waiting on buyer
//   disputed                 — paid, escrow HELD, admin review (disputeStatus open/…)
//   completed                — paid, escrow RELEASED; terminal
//   refunded                 — paid, escrow REFUNDED; terminal (dispute resolved)
//   cancelled                — payment abandoned; terminal
//
// TERMINAL = completed | refunded | cancelled. Disputed is NOT terminal: it
// resolves to completed or refunded. This is the single agreed definition both
// the frontend and backend share (backend: backend/src/services/orderStateMachine.js).
//
// Two legacy statuses existed before this machine and are normalised at the
// data boundary (see ordersService canonicalStatus): payment_confirmed ->
// awaiting_seller_delivery and in_transfer -> credentials_submitted. Nothing
// EVER writes a legacy status anymore; they can only appear on very old docs.
// Keeping the LEGACY_PAID_STATUSES constant here is only so tooling/tests can
// prove the normalisation path — it is never used to branch UI logic.
//
// Transition table (canonical on both sides):
//   pending_payment          -> awaiting_seller_delivery | cancelled
//   awaiting_seller_delivery -> credentials_submitted | disputed
//   credentials_submitted    -> completed | disputed
//   disputed                 -> completed | refunded
//   completed | refunded | cancelled -> (terminal, no outgoing)
// Admin-only (escrowController.resolve, no buyer/seller action):
//   awaiting_seller_delivery -> completed | refunded
//   credentials_submitted    -> completed | refunded
//   disputed                 -> completed | refunded
//
// The Buyer must ONLY confirm delivery from credentials_submitted — that is
// exactly the point where escrowStatus is STILL 'held'. Releasing before the
// seller submitted credentials is not a legal state.

export const ORDER_STATES = {
  pending_payment:          { label: 'Payment Pending',            color: 'text-yellow-500' },
  awaiting_seller_delivery: { label: 'Awaiting Seller Delivery',   color: 'text-yellow-600' },
  credentials_submitted:    { label: 'Account Details Submitted',  color: 'text-purple-500' },
  completed:                { label: 'Completed',                  color: 'text-green-500'  },
  disputed:                 { label: 'Disputed',                   color: 'text-red-500'    },
  refunded:                 { label: 'Refunded',                   color: 'text-gray-400'   },
  cancelled:                { label: 'Cancelled',                  color: 'text-gray-400'   },
};

// ORDER_STATUS is the SAME map as ORDER_STATES (identity alias): one object,
// one label+color truth. Every page importing ORDER_STATUS from constants reads
// the identical object the machine gates on — there is no second map to drift.
export const ORDER_STATUS = ORDER_STATES;

// Legacy statuses that pre-date the machine. Only ever READ + normalised; never
// written, and never used to branch UI logic. Exported solely so tests/tooling
// can prove the legacy boundary works.
export const LEGACY_PAID_STATUSES = ['payment_confirmed', 'in_transfer'];

const LEGACY_TO_CANONICAL = {
  payment_confirmed: 'awaiting_seller_delivery',
  in_transfer: 'credentials_submitted',
};

/** Canonical form of a stored status (legacy legacy -> canonical; else identity). */
export function canonicalStatus(status) {
  return LEGACY_TO_CANONICAL[status] || status || '';
}

/** Paid AND currently held/in-flight (not terminal). Canonical only. */
export const PAID_AND_PENDING_STATUSES = ['awaiting_seller_delivery', 'credentials_submitted'];

/** Paid states (held or released) plus the paid dispute/refunded states. */
export const PAID_STATUSES = [
  'awaiting_seller_delivery',
  'credentials_submitted',
  'completed',
  'disputed',
  'refunded',
];

/** Terminal states: nothing can ever happen after these. Disputed NOT terminal. */
export const TERMINAL_STATUSES = ['completed', 'refunded', 'cancelled'];

export const isPaidStatus = (status) => PAID_STATUSES.includes(canonicalStatus(status));

export const isTerminalStatus = (status) => TERMINAL_STATUSES.includes(canonicalStatus(status));

export const isClosedStatus = (status) => TERMINAL_STATUSES.includes(canonicalStatus(status));

// Seller can submit account details only while escrow is still being held and
// the seller hasn't delivered yet (or needs to resubmit — backend allows it).
export const sellerCanDeliver = (status) =>
  PAID_AND_PENDING_STATUSES.includes(canonicalStatus(status));

// Buyer can confirm delivery ONLY at credentials_submitted (escrow still held).
// After release (completed) it's too late — the escrowSignals responsibility.
export const buyerCanConfirm = (status) => canonicalStatus(status) === 'credentials_submitted';

// Buyer can raise a dispute on any paid, non-terminal state — payment must be in
// so there is something to actually protect.
export const buyerCanDispute = (status) => {
  const s = canonicalStatus(status);
  return PAID_STATUSES.includes(s) && !TERMINAL_STATUSES.includes(s);
};

// Frontend mirror of the backend admin-only resolve eligibility
// (escrowController.resolve): held paid states that only an admin can move.
export const adminCanResolve = (status) => {
  const s = canonicalStatus(status);
  return ['awaiting_seller_delivery', 'credentials_submitted', 'disputed'].includes(s);
};

// ---------------------------------------------------------------------------
// Validation / single-source assertions
// ---------------------------------------------------------------------------

export const VALID_TRANSITIONS = {
  pending_payment:          ['awaiting_seller_delivery', 'cancelled'],
  awaiting_seller_delivery: ['credentials_submitted', 'disputed'],
  credentials_submitted:    ['completed', 'disputed'],
  disputed:                 ['completed', 'refunded'],
  completed:                [],
  refunded:                 [],
  cancelled:                [],
};

// Admin-only arcs (escrowController.resolve / force payout / force refund).
// The buyer/seller can NEVER push these — only an admin can. Mirrors backend
// escrowController.resolveOrderDispute + forcePayout + forceRefund. Technically
// licences "held" admin overrides that the VALID_TRANSITIONS machine disallows.
export const ADMIN_ONLY_TRANSITIONS = {
  awaiting_seller_delivery: ['completed', 'refunded'],
  credentials_submitted:    ['completed', 'refunded'],
  disputed:                 ['completed', 'refunded'],
};

/**
 * assertValidTransition(from, to, { admin })
 * Throws if `to` is not a legal transition from `from` on the canonical
 * machine. Same-state writes and admin-only arcs (opts.admin) are allowed.
 * Mirrors backend/src/services/orderStateMachine.js — keep in sync.
 */
export function assertValidTransition(from, to, opts = {}) {
  const f = canonicalStatus(from);
  const t = canonicalStatus(to);
  if (!f || !t) return;
  if (f === t) return;

  const allowed = VALID_TRANSITIONS[f] || [];
  if (allowed.includes(t)) return;

  const adminAllowed = (opts && opts.admin ? ADMIN_ONLY_TRANSITIONS[f] : []) || [];
  if (adminAllowed.includes(t)) return;

  throw new Error(
    `Invalid order transition: ${from} -> ${to}. The state machine only allows '${f}' -> [${allowed.concat(adminAllowed).join(', ') || 'terminal'}].`
  );
}

// Per-state invariants the backend also enforces (validateOrder). Used in dev
// to surface contradictory orders that would otherwise be silently misread.
const STATE_INVARIANTS = {
  pending_payment:          { paymentStatus: 'pending',  escrowStatus: 'none' },
  awaiting_seller_delivery: { paymentStatus: 'paid',     escrowStatus: 'held' },
  credentials_submitted:    { paymentStatus: 'paid',     escrowStatus: 'held' },
  completed:                { paymentStatus: 'paid',     escrowStatus: 'released' },
  disputed:                 { paymentStatus: 'paid',     escrowStatus: 'held' },
  refunded:                 { paymentStatus: 'paid',     escrowStatus: 'refunded' },
  cancelled:                { paymentStatus: 'abandoned',escrowStatus: 'none' },
};

/**
 * validateOrderState(order) -> string[]
 * Dev-time detector for an order document that contradicts the machine
 * (contradiction surface). Returns the list of issues; empty = consistent.
 * Only checks fields the order actually carries, so minimal legacy docs don't
 * false-positive.
 */
export function validateOrderState(order = {}) {
  if (!order.status) return [];
  const status = canonicalStatus(order.status);
  const expected = STATE_INVARIANTS[status];
  if (!expected) return [`unknown order status: ${order.status}`];

  const issues = [];
  const checkField = (field, want) => {
    if (order[field] !== undefined && order[field] !== want) {
      issues.push(`${field}=${order[field]} contradicts order status '${status}' (expected ${want})`);
    }
  };
  checkField('paymentStatus', expected.paymentStatus);
  checkField('escrowStatus', expected.escrowStatus ? expected.escrowStatus : undefined);

  if (status === 'disputed') {
    const d = order.disputeStatus;
    if (d && !['open', 'under_review', 'resolved'].includes(d)) {
      issues.push(`disputeStatus=${d} must be one of open|under_review|resolved`);
    }
  }
  return issues;
}

export default orderState_for_legacy_imports;

// Legacy default (harmless keep-alive for any old dynamic import):
// simply the utility map removal intent. Real consumers import named exports.
function orderState_for_legacy_imports() {
  return ORDER_STATUS;
}
