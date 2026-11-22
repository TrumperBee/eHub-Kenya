import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ANALYTICS_DAYS,
  buildCompletedOrdersCsv,
  buildLastNDays,
  buildRegistrationSeries,
  buildRevenueSeries,
  buildStatusBreakdown,
  buildTopSellers,
  dayKey,
  timestampMs,
  totalCompletedValue,
  totalPlatformFees,
} from './analytics.js';
import { platformFee } from './payouts.js';

const AT_10AM = (isoDate) => new Date(`${isoDate}T10:00:00`);
const NOW = AT_10AM('2026-03-31');

test('dayKey uses the local calendar day', () => {
  assert.equal(dayKey(new Date(2026, 2, 5, 10, 0)), '2026-03-05');
  assert.equal(dayKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('buildLastNDays returns a fixed-length window ending today', () => {
  const buckets = buildLastNDays(3, NOW);
  assert.deepEqual(
    buckets.map((bucket) => bucket.key),
    ['2026-03-29', '2026-03-30', '2026-03-31']
  );
  assert.equal(buildLastNDays(ANALYTICS_DAYS, NOW).length, ANALYTICS_DAYS);
});

test('timestampMs accepts Firestore Timestamps, {seconds}, Date and ISO strings', () => {
  const date = new Date('2026-03-01T00:00:00.000Z');
  const ms = date.getTime();
  assert.equal(timestampMs({ toDate: () => date }), ms);
  assert.equal(timestampMs({ toMillis: () => ms }), ms);
  assert.equal(timestampMs({ seconds: ms / 1000 }), ms);
  assert.equal(timestampMs(date), ms);
  assert.equal(timestampMs('2026-03-01T00:00:00.000Z'), ms);
  assert.equal(timestampMs(null), 0);
  assert.equal(timestampMs('not a date'), 0);
});

test('revenue series sums only completed orders, per day, inside the window', () => {
  const series = buildRevenueSeries(
    [
      { status: 'completed', amount: 1000, completedAt: AT_10AM('2026-03-30') },
      { status: 'completed', amount: 500, completedAt: AT_10AM('2026-03-30') },
      { status: 'completed', amount: 2000, completedAt: AT_10AM('2026-03-31') },
      // Not completed: ignored even though it has an amount.
      { status: 'credentials_submitted', amount: 9999, createdAt: AT_10AM('2026-03-31') },
      // Completed but before the window.
      { status: 'completed', amount: 7777, completedAt: AT_10AM('2025-01-01') },
    ],
    { days: 3, now: NOW }
  );

  assert.deepEqual(
    series.map((point) => [point.key, point.value]),
    [
      ['2026-03-29', 0],
      ['2026-03-30', 1500],
      ['2026-03-31', 2000],
    ]
  );
});

test('revenue series treats legacy completed-ish records only when canonical', () => {
  const series = buildRevenueSeries(
    [{ status: 'payment_confirmed', amount: 400, createdAt: AT_10AM('2026-03-31') }],
    { days: 1, now: NOW }
  );
  assert.equal(series[0].value, 0);
});

test('registration series counts users per day from createdAt', () => {
  const series = buildRegistrationSeries(
    [
      { createdAt: AT_10AM('2026-03-29') },
      { createdAt: AT_10AM('2026-03-31') },
      { createdAt: AT_10AM('2026-03-31') },
      { createdAt: null },
    ],
    { days: 3, now: NOW }
  );

  assert.deepEqual(
    series.map((point) => [point.key, point.value]),
    [
      ['2026-03-29', 1],
      ['2026-03-30', 0],
      ['2026-03-31', 2],
    ]
  );
});

test('status breakdown lists every known status, zero-filled', () => {
  const data = buildStatusBreakdown([
    { status: 'completed' },
    { status: 'completed' },
    { status: 'pending_payment' },
    { status: 'payment_confirmed' },
    { status: 'payment_failed' },
    { status: 'something_new' },
  ]);

  const counts = Object.fromEntries(data.map((entry) => [entry.status, entry.count]));
  assert.equal(counts.completed, 2);
  assert.equal(counts.pending_payment, 1);
  // Legacy value is folded into its canonical state.
  assert.equal(counts.awaiting_seller_delivery, 1);
  assert.equal(counts.payment_failed, 1);
  assert.equal(counts.something_new, 1);
  assert.equal(counts.disputed, 0);
  assert.equal(
    data.find((entry) => entry.status === 'pending_payment').label,
    'Payment Pending'
  );
});

test('top sellers ranks by completed orders and ignores other statuses', () => {
  const sellers = buildTopSellers(
    [
      { status: 'completed', sellerId: 's1', amount: 100, sellerDisplayName: 'Alpha' },
      { status: 'completed', sellerId: 's1', amount: 100, sellerDisplayName: 'Alpha' },
      { status: 'completed', sellerId: 's2', amount: 900, sellerDisplayName: 'Beta' },
      { status: 'completed', sellerId: 's3', amount: 5000, sellerDisplayName: 'Gamma' },
      { status: 'awaiting_seller_delivery', sellerId: 's4', amount: 100 },
    ],
    2
  );

  assert.equal(sellers.length, 2);
  assert.deepEqual(
    sellers.map((seller) => [seller.sellerId, seller.orders]),
    [
      ['s1', 2],
      ['s3', 1],
    ]
  );
  // Ties on order count are broken by revenue (s3 5000 > s2 900).
});

test('top sellers falls back to a short id when no display name exists', () => {
  const [seller] = buildTopSellers([
    { status: 'completed', sellerId: 'abcdef123456', amount: 10 },
  ]);
  assert.equal(seller.name, 'Seller abcdef');
});

test('fees and completed value use the shared payout helper', () => {
  const orders = [
    { status: 'completed', amount: 2000 },
    { status: 'completed', amount: 500 },
    { status: 'pending_payment', amount: 9000 },
  ];
  assert.equal(totalCompletedValue(orders), 2500);
  assert.equal(totalPlatformFees(orders), platformFee(2000) + platformFee(500));
});

test('CSV includes only completed orders, newest first, with a header', () => {
  const csv = buildCompletedOrdersCsv([
    { id: 'old', status: 'completed', amount: 100, buyerId: 'b1', sellerId: 's1', completedAt: AT_10AM('2026-03-01') },
    { id: 'skip', status: 'disputed', amount: 300, buyerId: 'b2', sellerId: 's2', createdAt: AT_10AM('2026-03-05') },
    { id: 'new', status: 'completed', amount: 200, buyerId: 'b3', sellerId: 's3', completedAt: AT_10AM('2026-03-20') },
  ]);

  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'date,orderId,buyerId,sellerId,amount,platformFee,status');
  assert.equal(lines.length, 3);
  assert.ok(lines[1].includes('new'));
  assert.ok(lines[2].includes('old'));
  assert.ok(!csv.includes('skip'));
  assert.ok(lines[1].endsWith(',completed'));
});

test('CSV quotes cells containing commas, quotes or newlines', () => {
  const csv = buildCompletedOrdersCsv([
    {
      id: 'ord,"1"',
      status: 'completed',
      amount: 100,
      buyerId: 'line\nbreak',
      sellerId: 's1',
      completedAt: AT_10AM('2026-03-20'),
    },
  ]);
  assert.ok(csv.includes('"ord,""1"""'));
  assert.ok(csv.includes('"line\nbreak"'));
});
