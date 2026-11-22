import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getNextTierProgress,
  getTierFromSalesCount,
  normalizeSalesCount,
} from './sellerTier.js';

test('sales counts are normalized to a non-negative integer', () => {
  assert.equal(normalizeSalesCount(undefined), 0);
  assert.equal(normalizeSalesCount(null), 0);
  assert.equal(normalizeSalesCount(''), 0);
  assert.equal(normalizeSalesCount('not a number'), 0);
  assert.equal(normalizeSalesCount(-4), 0);
  assert.equal(normalizeSalesCount(7.9), 7);
  assert.equal(normalizeSalesCount('12'), 12);
});

test('tier boundaries use completed sales only', () => {
  assert.deepEqual(getTierFromSalesCount(0), { label: 'NEW SELLER', color: '#6B7280' });
  assert.deepEqual(getTierFromSalesCount(2), { label: 'NEW SELLER', color: '#6B7280' });
  assert.deepEqual(getTierFromSalesCount(3), { label: 'RISING', color: '#003BFF' });
  assert.deepEqual(getTierFromSalesCount(9), { label: 'RISING', color: '#003BFF' });
  assert.deepEqual(getTierFromSalesCount(10), { label: 'TRUSTED', color: '#F97316' });
  assert.deepEqual(getTierFromSalesCount(24), { label: 'TRUSTED', color: '#F97316' });
  assert.deepEqual(getTierFromSalesCount(25), { label: 'ELITE', color: '#7C3AED' });
  assert.deepEqual(getTierFromSalesCount(49), { label: 'ELITE', color: '#7C3AED' });
  assert.deepEqual(getTierFromSalesCount(50), { label: 'TOP SELLER', color: '#CA8A04' });
  assert.deepEqual(getTierFromSalesCount(120), { label: 'TOP SELLER', color: '#CA8A04' });
});

test('legacy sellers without a completedSalesCount field start at NEW SELLER', () => {
  assert.deepEqual(getTierFromSalesCount(undefined), { label: 'NEW SELLER', color: '#6B7280' });
  assert.deepEqual(getTierFromSalesCount(NaN), { label: 'NEW SELLER', color: '#6B7280' });
});

test('progress copy is text only and uses the correct plural', () => {
  assert.deepEqual(getNextTierProgress(0), {
    salesRemaining: 3,
    nextLabel: 'RISING',
    message: '3 more sales to RISING',
  });
  assert.deepEqual(getNextTierProgress(2), {
    salesRemaining: 1,
    nextLabel: 'RISING',
    message: '1 more sale to RISING',
  });
  assert.equal(getNextTierProgress(9).message, '1 more sale to TRUSTED');
  assert.equal(getNextTierProgress(10).message, '15 more sales to ELITE');
  assert.equal(getNextTierProgress(25).message, '25 more sales to TOP SELLER');
});

test('top tier has no next tier to progress toward', () => {
  assert.deepEqual(getNextTierProgress(50), {
    salesRemaining: 0,
    nextLabel: null,
    message: 'TOP SELLER tier reached',
  });
});
