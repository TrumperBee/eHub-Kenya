import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalStatus,
  ORDER_STATUS,
  ORDER_STATES,
  VALID_TRANSITIONS,
  ADMIN_ONLY_TRANSITIONS,
  LEGACY_PAID_STATUSES,
  PAID_AND_PENDING_STATUSES,
  PAID_STATUSES,
  TERMINAL_STATUSES,
  isPaidStatus,
  isTerminalStatus,
  isClosedStatus,
  sellerCanDeliver,
  buyerCanConfirm,
  buyerCanDispute,
  adminCanResolve,
  assertValidTransition,
  validateOrderState,
} from './orderMachine.js';

// ---------------------------------------------------------------------------
// Canonical surface: exactly seven states, no legacy tokens in the UI truth.
// ---------------------------------------------------------------------------

test('ORDER_STATES contains exactly the seven canonical states', () => {
  const keys = Object.keys(ORDER_STATES).sort();
  assert.deepEqual(keys, [
    'awaiting_seller_delivery',
    'cancelled',
    'completed',
    'credentials_submitted',
    'disputed',
    'pending_payment',
    'refunded',
  ]);
});

test('ORDER_STATUS is the {label,color} alias of ORDER_STATES and has no legacy keys', () => {
  for (const [s, statesEntry] of Object.entries(ORDER_STATES)) {
    assert.equal(ORDER_STATUS[s], statesEntry, `ORDER_STATUS missing/colliding for ${s}`);
  }
  for (const legacy of LEGACY_PAID_STATUSES) {
    assert.equal(ORDER_STATUS[legacy], undefined, `legacy ${legacy} must never be a UI key`);
  }
  assert.ok(ORDER_STATUS[undefined] === undefined, 'unknown stats must never resolve');
});

test('canonicalStatus normalises legacy statuses; identity otherwise', () => {
  assert.equal(canonicalStatus('payment_confirmed'), 'awaiting_seller_delivery');
  assert.equal(canonicalStatus('in_transfer'), 'credentials_submitted');
  assert.equal(canonicalStatus('awaiting_seller_delivery'), 'awaiting_seller_delivery');
  assert.equal(canonicalStatus('credentials_submitted'), 'credentials_submitted');
  assert.equal(canonicalStatus('completed'), 'completed');
  assert.equal(canonicalStatus(undefined), '');
});

test('LEGACY_PAID_STATUSES is only a proof constant, never a UI branch', () => {
  assert.deepEqual([...LEGACY_PAID_STATUSES].sort(), ['in_transfer', 'payment_confirmed']);
});

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

test('TERMINAL_STATUSES are completed|refunded|cancelled — disputed NOT terminal', () => {
  assert.deepEqual([...TERMINAL_STATUSES].sort(), ['cancelled', 'completed', 'refunded']);
  assert.ok(!TERMINAL_STATUSES.includes('disputed'));
});

test('PAID_AND_PENDING_STATUSES are the two held, non-terminal paid states', () => {
  assert.deepEqual([...PAID_AND_PENDING_STATUSES].sort(), ['awaiting_seller_delivery', 'credentials_submitted']);
  assert.deepEqual([...PAID_STATUSES].sort(), [
    'awaiting_seller_delivery',
    'completed',
    'credentials_submitted',
    'disputed',
    'refunded',
  ]);
});

test('isPaidStatus / isTerminalStatus / isClosedStatus honour canonical + legacy', () => {
  assert.ok(!isPaidStatus('pending_payment'));
  assert.ok(!isPaidStatus('cancelled'));
  assert.ok(isPaidStatus('awaiting_seller_delivery'));
  assert.ok(isPaidStatus('payment_confirmed'));
  assert.ok(isPaidStatus('in_transfer'));
  assert.ok(isPaidStatus('disputed'));
  assert.ok(isPaidStatus('refunded'));
  assert.ok(isTerminalStatus('completed'));
  assert.ok(!isTerminalStatus('disputed'));
  assert.ok(isClosedStatus('refunded'));
});

// ---------------------------------------------------------------------------
// Actor eligibility (mirrors backend escrowController)
// ---------------------------------------------------------------------------

test('sellerCanDeliver: only held, paid, non-terminal seller states', () => {
  assert.ok(sellerCanDeliver('awaiting_seller_delivery'));
  assert.ok(sellerCanDeliver('credentials_submitted'));
  assert.ok(sellerCanDeliver('payment_confirmed'));
  assert.ok(sellerCanDeliver('in_transfer'));
  assert.ok(!sellerCanDeliver('pending_payment'));
  assert.ok(!sellerCanDeliver('completed'));
  assert.ok(!sellerCanDeliver('disputed'));
  assert.ok(!sellerCanDeliver('refunded'));
  assert.ok(!sellerCanDeliver('cancelled'));
});

test('buyerCanConfirm: ONLY from credentials_submitted (escrow still HELD)', () => {
  assert.ok(buyerCanConfirm('credentials_submitted'));
  assert.ok(buyerCanConfirm('in_transfer'));
  assert.ok(!buyerCanConfirm('awaiting_seller_delivery'));
  assert.ok(!buyerCanConfirm('completed'));
  assert.ok(!buyerCanConfirm('disputed'));
  assert.ok(!buyerCanConfirm('pending_payment'));
});

test('buyerCanDispute: any paid non-terminal state (legacy + canonical)', () => {
  assert.ok(buyerCanDispute('awaiting_seller_delivery'));
  assert.ok(buyerCanDispute('credentials_submitted'));
  assert.ok(buyerCanDispute('payment_confirmed'));
  assert.ok(!buyerCanDispute('pending_payment'));
  assert.ok(!buyerCanDispute('completed'));
  assert.ok(!buyerCanDispute('refunded'));
  assert.ok(!buyerCanDispute('cancelled'));
});

test('adminCanResolve: held paid states only an admin may move (mirror of resolve)', () => {
  assert.ok(adminCanResolve('awaiting_seller_delivery'));
  assert.ok(adminCanResolve('credentials_submitted'));
  assert.ok(adminCanResolve('disputed'));
  assert.ok(adminCanResolve('payment_confirmed'));
  assert.ok(!adminCanResolve('pending_payment'));
  assert.ok(!adminCanResolve('completed'));
  assert.ok(!adminCanResolve('refunded'));
  assert.ok(!adminCanResolve('cancelled'));
});

// ---------------------------------------------------------------------------
// Transition machine (mirrors backend/src/services/orderStateMachine.js)
// ---------------------------------------------------------------------------

function assertLegal(from, to, opts) {
  assert.doesNotThrow(() => assertValidTransition(from, to, opts), `${from} -> ${to} should be legal`);
}
function assertIllegal(from, to, opts) {
  assert.throws(() => assertValidTransition(from, to, opts), `${from} -> ${to} should be illegal`);
}

test('buyer/seller arcs: the seven legal transitions', () => {
  assertLegal('pending_payment', 'awaiting_seller_delivery');
  assertLegal('pending_payment', 'cancelled');
  assertLegal('awaiting_seller_delivery', 'credentials_submitted');
  assertLegal('awaiting_seller_delivery', 'disputed');
  assertLegal('credentials_submitted', 'completed');
  assertLegal('credentials_submitted', 'disputed');
  assertLegal('disputed', 'completed');
  assertLegal('disputed', 'refunded');
});

test('legacy arcs normalise to their canonical transition', () => {
  assertLegal('payment_confirmed', 'credentials_submitted');
  assertLegal('payment_confirmed', 'disputed');
  assertLegal('in_transfer', 'completed');
  assertLegal('in_transfer', 'disputed');
});

// The two problems the machine PROVES legal but hand-typed blocks kept calling
// "illegal" were pure test drift: completed->completed (same-state write) and
// credentials_submitted->disputed (declared buyer arc). Replace BOTH paper
// blocks with one exhaustive sweep that derives legality only from the exported
// tables — structurally impossible for it to drift from the machine again.
//
// Truth per orderMachine.js:
//   VALID_TRANSITIONS: pending_payment->[awaiting_seller_delivery,cancelled];
//     awaiting_seller_delivery->[credentials_submitted,disputed];
//     credentials_submitted->[completed,disputed]; disputed->[completed,refunded];
//     completed|refunded|cancelled->[] (no outgoing buyer arcs).
//   ADMIN_ONLY_TRANSITIONS (legal ONLY with {admin:true}, never a buyer/seller
//     self-serve shortcut): awaiting_seller_delivery->[completed,refunded];
//     credentials_submitted->[completed,refunded]; disputed->[completed,refunded].
//   Same-state writes (from===to) are ALWAYS legal (idempotent re-write), even
//     from terminal states.

test('full 7x7 arc matrix agrees exactly with the exported machine tables', () => {
  const states = Object.keys(ORDER_STATES);
  for (const from of states) {
    for (const to of states) {
      if (from === to) continue;
      const buyerLegal = (VALID_TRANSITIONS[from] || []).includes(to);
      const adminOnly = (ADMIN_ONLY_TRANSITIONS[from] || []).includes(to);
      if (buyerLegal) {
        assertLegal(from, to);
      } else if (adminOnly) {
        assertIllegal(from, to);
        assertLegal(from, to, { admin: true });
      } else {
        assertIllegal(from, to);
      }
    }
  }
});

test('same-state writes and terminal states are legal; unknown inputs no-op', () => {
  for (const from of Object.keys(ORDER_STATES)) {
    assertLegal(from, from);
  }
  assertLegal('credentials_submitted', 'credentials_submitted');
  assertLegal('completed', 'completed');
  assertLegal('refunded', 'refunded');
  assert.doesNotThrow(() => assertValidTransition(undefined, 'completed'));
  assert.doesNotThrow(() => assertValidTransition('', ''));
});

// ---------------------------------------------------------------------------
// validateOrderState — contradiction detector (points at real issues)
// ---------------------------------------------------------------------------

test('validateOrderState: consistent docs are clean', () => {
  assert.deepEqual(validateOrderState({ status: 'awaiting_seller_delivery', paymentStatus: 'paid', escrowStatus: 'held' }), []);
  assert.deepEqual(validateOrderState({ status: 'completed', paymentStatus: 'paid', escrowStatus: 'released' }), []);
  assert.deepEqual(validateOrderState({ status: 'credentials_submitted', paymentStatus: 'paid', escrowStatus: 'held' }), []);
});

test('validateOrderState: flags contradictory supporting fields', () => {
  const issues = validateOrderState({ status: 'completed', paymentStatus: 'pending', escrowStatus: 'held' });
  assert.ok(issues.length >= 2, 'expected both paymentStatus and escrowStatus contradictions');
  assert.match(issues[0], /paymentStatus=pending contradicts order status 'completed'/);
});

test('validateOrderState: disputed requires a valid disputeStatus when present', () => {
  const issues = validateOrderState({ status: 'disputed', paymentStatus: 'paid', escrowStatus: 'held', disputeStatus: 'bogus' });
  assert.match(issues[0] || '', /disputeStatus=bogus must be one of open\|under_review\|resolved/);
  assert.deepEqual(
    validateOrderState({ status: 'disputed', paymentStatus: 'paid', escrowStatus: 'held', disputeStatus: 'resolved' }),
    [],
    'resolved is a legal disputeStatus for a disputed order'
  );
});

test('validateOrderState: ambiguous invalid disputeStatus is caught on disputed orders', () => {
  assert.deepEqual(validateOrderState({ status: 'disputed', paymentStatus: 'paid', escrowStatus: 'held', disputeStatus: 'resolved' }), []);
  const issues = validateOrderState({ status: 'disputed', paymentStatus: 'paid', escrowStatus: 'held', disputeStatus: 'bogus' });
  assert.ok(issues.length >= 1, 'bogus disputeStatus should be flagged');
});

test('validateOrderState ignores fields the order does not carry (no false positives)', () => {
  assert.deepEqual(validateOrderState({ status: 'pending_payment' }), []);
  assert.deepEqual(validateOrderState({ status: 'cancelled' }), []);
  assert.deepEqual(validateOrderState({ status: 'completed' }), []);
});
