import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISPUTE_RESOLUTIONS,
  buildDisputeResolution,
  formatKesLabel,
  isResolvedDispute,
} from './disputeResolver.js';

const baseOrder = {
  id: 'order-1',
  amount: 7500,
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  paymentPhone: '254700000001',
};

test('release resolution: updates order to completed and escrow released', () => {
  const plan = buildDisputeResolution(baseOrder, 'release', {
    actorId: 'admin-1',
    actorName: 'Juma',
    buyerPhone: baseOrder.paymentPhone,
    sellerPhone: '254700000002',
  });
  assert.equal(plan.resolutionKey, DISPUTE_RESOLUTIONS.release.key);
  assert.equal(plan.orderPatch.status, 'completed');
  assert.equal(plan.orderPatch.escrowStatus, 'released');
  assert.equal(plan.orderPatch.disputeResolution, DISPUTE_RESOLUTIONS.release.key);
  assert.equal(plan.orderPatch.resolvedById, 'admin-1');
  assert.equal(plan.orderPatch.resolvedByName, 'Juma');
});

test('release resolution includes disputeStatus resolved and audit trail', () => {
  const plan = buildDisputeResolution(baseOrder, 'release', {
    actorId: 'admin-1',
    actorName: 'Juma',
    buyerPhone: baseOrder.paymentPhone,
    sellerPhone: '254700000002',
  });
  assert.equal(plan.orderPatch.disputeStatus, 'resolved');
  assert.equal(plan.orderPatch.disputeResolvedBy, 'admin-1');
  assert.equal(plan.orderPatch.disputeResolvedByName, 'Juma');
  assert.ok(plan.orderPatch.disputeResolvedAt);
  assert.equal(plan.orderPatch.adminReviewRequired, false);
});

test('refund resolution: updates order to refunded and escrow refunded', () => {
  const plan = buildDisputeResolution(baseOrder, 'refund', {
    actorId: 'admin-1',
    buyerPhone: baseOrder.paymentPhone,
    sellerPhone: '254700000002',
  });
  assert.equal(plan.resolutionKey, DISPUTE_RESOLUTIONS.refund.key);
  assert.equal(plan.orderPatch.status, 'refunded');
  assert.equal(plan.orderPatch.escrowStatus, 'refunded');
  assert.equal(plan.orderPatch.disputeResolution, DISPUTE_RESOLUTIONS.refund.key);
});

test('refund resolution includes disputeStatus resolved and audit trail', () => {
  const plan = buildDisputeResolution(baseOrder, 'refund', {
    actorId: 'admin-1',
    actorName: 'Amina',
  });
  assert.equal(plan.orderPatch.disputeStatus, 'resolved');
  assert.equal(plan.orderPatch.disputeResolvedBy, 'admin-1');
  assert.equal(plan.orderPatch.disputeResolvedByName, 'Amina');
  assert.equal(plan.orderPatch.adminReviewRequired, false);
  assert.equal(plan.orderPatch.resolvedById, 'admin-1');
});

test('refund manual action references buyer phone and amount for the refund', () => {
  const plan = buildDisputeResolution(baseOrder, 'refund', {
    buyerPhone: baseOrder.paymentPhone,
    sellerPhone: '254700000002',
  });
  assert.equal(plan.manualAction.type, 'refund_reversal');
  assert.match(plan.manualAction.detail, /254700000001/);
  assert.match(plan.manualAction.detail, /KES 7,500/);
});

test('release manual action references seller phone and amount for the payout', () => {
  const plan = buildDisputeResolution(baseOrder, 'release', {
    buyerPhone: baseOrder.paymentPhone,
    sellerPhone: '254700000002',
  });
  assert.equal(plan.manualAction.type, 'release_payout');
  assert.match(plan.manualAction.detail, /254700000002/);
  assert.match(plan.manualAction.detail, /KES 7,500/);
});

test('release manual action falls back gracefully when seller phone is unknown', () => {
  const plan = buildDisputeResolution(baseOrder, 'release', {
    buyerPhone: baseOrder.paymentPhone,
    sellerPhone: '',
  });
  assert.match(plan.manualAction.detail, /phone on record/);
});

test('unknown resolution throws', () => {
  assert.throws(() => buildDisputeResolution(baseOrder, 'bogus'), /Unknown dispute resolution/);
});

test('formatKesLabel pads thousands separators', () => {
  assert.equal(formatKesLabel(7500), 'KES 7,500');
  assert.equal(formatKesLabel(0), 'KES 0');
});

test('isResolvedDispute detects disputeStatus resolved', () => {
  assert.equal(isResolvedDispute({ disputeStatus: 'resolved' }), true);
});

test('isResolvedDispute detects legacy refund key', () => {
  assert.equal(isResolvedDispute({ disputeResolution: 'refunded_to_buyer' }), true);
});

test('isResolvedDispute detects current refund key', () => {
  assert.equal(isResolvedDispute({ disputeResolution: 'refunded' }), true);
});

test('isResolvedDispute returns false for open dispute', () => {
  assert.equal(isResolvedDispute({ disputeStatus: 'open', disputeReason: 'bad' }), false);
});
