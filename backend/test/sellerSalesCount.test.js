const test = require('node:test');
const assert = require('node:assert/strict');

const { sellerCompletedSalePatch } = require('../src/services/sellerSalesCount');

test('completing an order increments both sales counters', () => {
  const patch = sellerCompletedSalePatch({
    increment: (value) => ({ __increment: value }),
    serverTimestamp: () => ({ __serverTimestamp: true }),
  });

  assert.deepEqual(patch, {
    totalSales: { __increment: 1 },
    completedSalesCount: { __increment: 1 },
    updatedAt: { __serverTimestamp: true },
  });
});

test('the helper never writes a client-supplied absolute count', () => {
  const patch = sellerCompletedSalePatch({
    increment: (value) => `inc:${value}`,
    serverTimestamp: () => 'now',
  });

  assert.equal(patch.completedSalesCount, 'inc:1');
  assert.equal(patch.totalSales, 'inc:1');
});
