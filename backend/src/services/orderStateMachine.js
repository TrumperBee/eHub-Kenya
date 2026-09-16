// eHub Kenya — ONE authoritative order state machine (backend side).
//
// The seven canonical states. Every backend transition must pass through
// assertValidTransition() before the Firestore write, so an impossible
// combination (e.g. paymentStatus='pending' + status='awaiting_seller_delivery')
// fails loudly during development instead of silently corrupting an order.
//
//   STATE 1  pending_payment          paymentStatus=pending   escrowStatus=none     buyer acts
//   STATE 2  awaiting_seller_delivery paymentStatus=paid      escrowStatus=held     seller acts
//   STATE 3  credentials_submitted    paymentStatus=paid      escrowStatus=held     buyer acts
//   STATE 4  completed                paymentStatus=paid      escrowStatus=released terminal
//   STATE 5  disputed                 paymentStatus=paid      escrowStatus=held     admin acts
//            disputeStatus: open | under_review | resolved
//   STATE 6  refunded                 paymentStatus=paid      escrowStatus=refunded terminal
//   STATE 7  cancelled                paymentStatus=abandoned escrowStatus=none     terminal
//
// Legacy statuses ('payment_confirmed', 'in_transfer') were used before this
// machine existed. They map onto canonical states; we READ them through
// canonicalStatus() so old orders stay valid, but nothing ever writes them.

const STATES = {
  pending_payment: {
    paymentStatus: 'pending',
    escrowStatus: 'none',
    terminal: false,
    label: 'Payment Pending',
  },
  awaiting_seller_delivery: {
    paymentStatus: 'paid',
    escrowStatus: 'held',
    terminal: false,
    label: 'Awaiting Seller Delivery',
  },
  credentials_submitted: {
    paymentStatus: 'paid',
    escrowStatus: 'held',
    terminal: false,
    label: 'Account Details Submitted',
  },
  completed: {
    paymentStatus: 'paid',
    escrowStatus: 'released',
    terminal: true,
    label: 'Completed',
  },
  disputed: {
    paymentStatus: 'paid',
    escrowStatus: 'held',
    terminal: false, // resolves to completed or refunded
    label: 'Disputed',
  },
  refunded: {
    paymentStatus: 'paid',
    escrowStatus: 'refunded',
    terminal: true,
    label: 'Refunded',
  },
  cancelled: {
    paymentStatus: 'abandoned',
    escrowStatus: 'none',
    terminal: true,
    label: 'Cancelled',
  },
};

const LEGACY_STATUS_MAP = {
  payment_confirmed: 'awaiting_seller_delivery',
  in_transfer: 'credentials_submitted',
};

function canonicalStatus(status) {
  return (status && LEGACY_STATUS_MAP[status]) || status || '';
}

/**
 * State-machine transition table (canonical states only).
 *
 * ADMIN_ONLY transitions are documented exception arcs available exclusively
 * through /api/escrow/resolve (admin manual release/refund), so an admin can
 * complete or refund a stuck paid order that never received credentials.
 */
const VALID_TRANSITIONS = {
  pending_payment: ['awaiting_seller_delivery', 'cancelled'],
  awaiting_seller_delivery: ['credentials_submitted', 'disputed'],
  credentials_submitted: ['completed', 'disputed'],
  completed: [],
  disputed: ['completed', 'refunded'],
  refunded: [],
  cancelled: [],
};

const ADMIN_ONLY_TRANSITIONS = {
  awaiting_seller_delivery: ['completed', 'refunded'],
  credentials_submitted: ['completed', 'refunded'],
  disputed: ['completed', 'refunded'],
};

/**
 * Throws when `to` is not a legal transition from `from`. Same-state writes
 * (e.g. seller re-submitting credentials) are always allowed. `opts.admin` is
 * required (and enforced by the caller) to use the documented admin arcs.
 */
function assertValidTransition(from, to, opts = {}) {
  const f = canonicalStatus(from);
  const t = canonicalStatus(to);
  if (!f || !t) return;
  if (f === t) return; // in-place update / resubmission

  const allowed = VALID_TRANSITIONS[f] || [];
  if (allowed.includes(t)) return;

  const adminAllowed = ADMIN_ONLY_TRANSITIONS[f] || [];
  if (opts && opts.admin && adminAllowed.includes(t)) return;

  throw new Error(
    `Invalid order transition: ${from} -> ${to}. The state machine only allows ` +
    `'${f}' -> [${allowed.concat(adminAllowed).join(', ') || 'terminal'}].`
  );
}

/**
 * Dev-time consistency checker for the FULL order document. Warns (and returns
 * the list of issues) whenever a stored order contradicts the machine — e.g.
 * paymentStatus='paid' with status='pending_payment', or
 * status='completed' with escrowStatus='held'. Only fields that exist on the
 * order are validated, so minimal legacy documents don't false-positive.
 */
function validateOrder(order = {}) {
  if (!order.status) return [];
  const canonical = canonicalStatus(order.status);
  const spec = STATES[canonical];
  if (!spec) return [`unknown order status: ${order.status}`];

  const issues = [];
  const check = (fieldName, expected) => {
    const actual = order[fieldName];
    if (actual !== undefined && actual !== expected) {
      issues.push(`${fieldName}=${actual} contradicting state '${canonical}' (expected ${expected})`);
    }
  };
  check('paymentStatus', spec.paymentStatus);
  check('escrowStatus', spec.escrowStatus);
  if (canonical === 'disputed') {
    const d = order.disputeStatus;
    if (d && !['open', 'under_review', 'resolved'].includes(d)) {
      issues.push(`disputeStatus=${d} must be open|under_review|resolved`);
    }
  }
  if (issues.length > 0) {
    console.warn(`[order-machine] IMPOSSIBLE STATE (order ${order.id || '?'}): ${issues.join('; ')}`);
  }
  return issues;
}

const isPaidState = (status) =>
  ['awaiting_seller_delivery', 'credentials_submitted', 'completed', 'disputed', 'refunded']
    .includes(canonicalStatus(status));

const isTerminalState = (status) => {
  const c = canonicalStatus(status);
  return STATES[c] ? STATES[c].terminal : false;
};

module.exports = {
  STATES,
  canonicalStatus,
  assertValidTransition,
  validateOrder,
  isPaidState,
  isTerminalState,
};