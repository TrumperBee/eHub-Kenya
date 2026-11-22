"use strict";

// eHub Kenya — overdue credential-submission policy tests (backend).
//
// Pure module: no Firebase, no clock, no network. Thresholds are asserted
// against a fixed reference instant so the suite never depends on the real date.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REMINDER_AFTER_MS,
  FLAG_AFTER_MS,
  MAX_WARNINGS,
  overdueClockMs,
  overdueAgeMs,
  overdueStage,
  nextSellerState,
} = require('../src/utils/overduePolicy');

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const orderAt = (ageMs, extra = {}) => ({
  status: 'awaiting_seller_delivery',
  paidAt: { toMillis: () => NOW - ageMs },
  ...extra,
});

test('thresholds are 5h reminder, 24h flag, 3 warnings', () => {
  assert.equal(REMINDER_AFTER_MS, 5 * HOUR);
  assert.equal(FLAG_AFTER_MS, 24 * HOUR);
  assert.equal(MAX_WARNINGS, 3);
});

test('the clock prefers paidAt and falls back to createdAt', () => {
  assert.equal(overdueClockMs({ paidAt: { toMillis: () => 123 } }), 123);
  assert.equal(overdueClockMs({ createdAt: { toDate: () => new Date(456) } }), 456);
  assert.equal(
    overdueClockMs({ paidAt: { toMillis: () => 100 }, createdAt: { toMillis: () => 900 } }),
    100
  );
  assert.equal(overdueClockMs({}), null);
  assert.equal(overdueAgeMs({}, NOW), null);
});

test('nothing happens before 5 hours', () => {
  assert.equal(overdueStage(orderAt(5 * HOUR - 1), NOW), 'none');
  assert.equal(overdueStage(orderAt(0), NOW), 'none');
  assert.equal(overdueStage(orderAt(-HOUR), NOW), 'none');
});

test('the 5-hour boundary produces exactly one reminder', () => {
  const order = orderAt(5 * HOUR);
  assert.equal(overdueStage(order, NOW), 'reminder');
  assert.equal(overdueStage({ ...order, sellerOverdueReminderSentAt: { seconds: 1 } }, NOW), 'none');
});

test('the 24-hour boundary escalates to a flag even if no reminder was sent', () => {
  assert.equal(overdueStage(orderAt(24 * HOUR - 1), NOW), 'reminder');
  assert.equal(overdueStage(orderAt(24 * HOUR), NOW), 'flag');
  assert.equal(
    overdueStage(orderAt(24 * HOUR, { sellerOverdueReminderSentAt: { seconds: 1 } }), NOW),
    'flag'
  );
});

test('an already-flagged or no-longer-waiting order is never flagged twice', () => {
  assert.equal(
    overdueStage(orderAt(30 * HOUR, { sellerOverdueFlaggedAt: { seconds: 1 } }), NOW),
    'none'
  );
  assert.equal(
    overdueStage(orderAt(30 * HOUR, { status: 'credentials_submitted' }), NOW),
    'none'
  );
  assert.equal(overdueStage(orderAt(30 * HOUR, { status: 'completed' }), NOW), 'none');
  assert.equal(overdueStage(orderAt(30 * HOUR, { status: 'refunded' }), NOW), 'none');
});

test('legacy orders without paidAt use createdAt', () => {
  const legacy = {
    status: 'awaiting_seller_delivery',
    createdAt: { toMillis: () => NOW - 6 * HOUR },
  };
  assert.equal(overdueStage(legacy, NOW), 'reminder');
});

test('orders with no usable timestamp are skipped, never flagged', () => {
  assert.equal(overdueStage({ status: 'awaiting_seller_delivery' }, NOW), 'none');
});

test('warning counts increment by one per flag', () => {
  assert.deepEqual(nextSellerState({}), { warningCount: 1, suspended: false, newlySuspended: false });
  assert.deepEqual(nextSellerState({ warnings: 0 }), {
    warningCount: 1,
    suspended: false,
    newlySuspended: false,
  });
  assert.deepEqual(nextSellerState({ warnings: 1 }), {
    warningCount: 2,
    suspended: false,
    newlySuspended: false,
  });
  assert.deepEqual(nextSellerState({ warnings: 2 }), {
    warningCount: 3,
    suspended: true,
    newlySuspended: true,
  });
});

test('a suspended seller is never re-suspended or counted past the limit', () => {
  assert.deepEqual(nextSellerState({ warnings: 3, suspended: true }), {
    warningCount: 3,
    suspended: true,
    newlySuspended: false,
  });
  assert.deepEqual(nextSellerState({ warnings: 99, suspended: true }), {
    warningCount: 3,
    suspended: true,
    newlySuspended: false,
  });
});

test('legacy string and negative warning values are normalised', () => {
  assert.equal(nextSellerState({ warnings: '2' }).warningCount, 3);
  assert.equal(nextSellerState({ warnings: 'not-a-number' }).warningCount, 1);
  assert.equal(nextSellerState({ warnings: -5 }).warningCount, 1);
});
