import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_DROP_DISCOUNT_PERCENT, validateDropPrice } from './fridayDropGuard.js';

test('creation-time submission: valid drop passes validation', () => {
  // regular 5000, drop 4000 => 20% off
  assert.equal(validateDropPrice(5000, 4000), null);
});

test('after-the-fact submission (existing listing): valid drop passes validation', () => {
  assert.equal(validateDropPrice(7500, 6000), null);
});

test('creation-time submission: empty drop price is rejected', () => {
  assert.equal(validateDropPrice(5000, ''), 'Enter a drop price');
  assert.equal(validateDropPrice(5000, 0), 'Enter a drop price');
});

test('after-the-fact submission: drop price not lower than regular is rejected', () => {
  assert.equal(validateDropPrice(5000, 5000), 'Drop price must be lower than the regular price');
  assert.equal(validateDropPrice(5000, 6000), 'Drop price must be lower than the regular price');
});

test('both paths: drop below 5% discount is rejected', () => {
  const discount = 4;
  const regular = 100;
  const drop = regular * (1 - discount / 100);
  assert.equal(validateDropPrice(regular, drop), `Drop must be at least ${MIN_DROP_DISCOUNT_PERCENT}% off to go live`);
});

test('both paths: exactly 5% discount passes', () => {
  assert.equal(validateDropPrice(100, 95), null);
});

test('both paths: non-numeric price handled safely', () => {
  assert.equal(validateDropPrice(0, 100), 'Drop price must be lower than the regular price');
});
