import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveOrderPlatform } from './orderPlatform.js';

test('normal listing with platform: uses listing platform', () => {
  assert.equal(resolveOrderPlatform({ dropPlatform: undefined, listingPlatform: 'ios' }), 'ios');
});

test('live Friday Drop purchase: drop platform wins over listing platform', () => {
  assert.equal(resolveOrderPlatform({ dropPlatform: 'android', listingPlatform: 'ios' }), 'android');
});

test('Friday Drop with platform but legacy listing missing platform: uses drop platform', () => {
  assert.equal(resolveOrderPlatform({ dropPlatform: 'android', listingPlatform: undefined }), 'android');
});

test('legacy listing with no platform and no drop: explicit null, never undefined', () => {
  const result = resolveOrderPlatform({ dropPlatform: undefined, listingPlatform: undefined });
  assert.equal(result, null);
  assert.notEqual(typeof result, 'undefined');
});

test('order payload for legacy listing never contains undefined platform', () => {
  const platform = resolveOrderPlatform({ dropPlatform: undefined, listingPlatform: undefined });
  const payload = { platform };
  assert.ok(Object.hasOwn(payload, 'platform'));
  assert.equal(Object.keys(payload).length, 1);
  assert.equal(payload.platform, null);
});