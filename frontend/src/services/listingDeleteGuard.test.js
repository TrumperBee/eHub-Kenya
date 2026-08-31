import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TERMINAL_ORDER_STATUSES,
  isOngoingOrderStatus,
  countOngoingOrders,
} from './listingDeleteGuard.js';

test('terminal order statuses are completed, cancelled, refunded', () => {
  assert.deepEqual([...TERMINAL_ORDER_STATUSES].sort(), ['cancelled', 'completed', 'refunded']);
});

test('pending_payment is an ongoing (non-terminal) status', () => {
  assert.equal(isOngoingOrderStatus('pending_payment'), true);
});

test('payment_confirmed and in_transfer are ongoing (non-terminal) statuses', () => {
  assert.equal(isOngoingOrderStatus('payment_confirmed'), true);
  assert.equal(isOngoingOrderStatus('in_transfer'), true);
});

test('disputed is ongoing (non-terminal) and blocks deletion', () => {
  assert.equal(isOngoingOrderStatus('disputed'), true);
});

test('completed, cancelled, refunded are terminal and allow deletion', () => {
  assert.equal(isOngoingOrderStatus('completed'), false);
  assert.equal(isOngoingOrderStatus('cancelled'), false);
  assert.equal(isOngoingOrderStatus('refunded'), false);
});

test('unknown status is treated as ongoing (blocks deletion)', () => {
  assert.equal(isOngoingOrderStatus('some_unknown_status'), true);
  assert.equal(isOngoingOrderStatus(undefined), true);
});

test('deletion is blocked when the listing has a pending order', () => {
  const orderStatuses = ['pending_payment'];
  const ongoing = countOngoingOrders(orderStatuses);
  assert.ok(ongoing > 0, 'expected deletion to be blocked');
});

test('deletion succeeds when the listing has no orders', () => {
  const orderStatuses = [];
  const ongoing = countOngoingOrders(orderStatuses);
  assert.equal(ongoing, 0, 'expected deletion to be allowed');
});

test('deletion succeeds when all orders are terminal', () => {
  const orderStatuses = ['completed', 'cancelled', 'refunded'];
  const ongoing = countOngoingOrders(orderStatuses);
  assert.equal(ongoing, 0, 'expected deletion to be allowed');
});

test('deletion is blocked when at least one order is ongoing among terminal ones', () => {
  const orderStatuses = ['completed', 'in_transfer', 'refunded'];
  const ongoing = countOngoingOrders(orderStatuses);
  assert.equal(ongoing, 1, 'expected exactly one ongoing order');
});
