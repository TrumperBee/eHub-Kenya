import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isPushSupported,
  serializePushSubscription,
  shouldShowPushPrompt,
  urlBase64ToUint8Array,
} from './push.js';

test('browser support requires serviceWorker, PushManager and Notification', () => {
  assert.equal(isPushSupported({ serviceWorker: {} }, { PushManager: {}, Notification: {} }), true);
  assert.equal(isPushSupported({}, { PushManager: {}, Notification: {} }), false);
  assert.equal(isPushSupported({ serviceWorker: {} }, { Notification: {} }), false);
  assert.equal(isPushSupported({ serviceWorker: {} }, { PushManager: {} }), false);
  assert.equal(isPushSupported(null, null), false);
});

test('VAPID base64url is decoded to bytes', () => {
  const bytes = urlBase64ToUint8Array('AQID');
  assert.deepEqual(Array.from(bytes), [1, 2, 3]);
});

test('VAPID decoding restores base64 padding', () => {
  // "BBAQ" encodes 3 bytes; a real key is 65 bytes and length % 4 === 3.
  const bytes = urlBase64ToUint8Array('BBAQ');
  assert.deepEqual(Array.from(bytes), [4, 16, 16]);
});

test('VAPID decoding handles url-safe characters', () => {
  // '--__' is the url-safe form of '++//'.
  assert.deepEqual(Array.from(urlBase64ToUint8Array('--__')), [251, 239, 255]);
});

test('an empty VAPID key is rejected instead of subscribing with garbage', () => {
  assert.throws(() => urlBase64ToUint8Array(''), /Missing VAPID public key/);
});

test('serializePushSubscription keeps only the fields the server needs', () => {
  const serialized = serializePushSubscription({
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    expirationTime: null,
    toJSON() {
      return {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'pkey', auth: 'asecret' },
        extra: 'dropped',
      };
    },
  });
  assert.deepEqual(serialized, {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    expirationTime: null,
    keys: { p256dh: 'pkey', auth: 'asecret' },
  });
});

test('incomplete subscriptions are rejected rather than posted', () => {
  assert.equal(serializePushSubscription(null), null);
  assert.equal(serializePushSubscription({ endpoint: 'https://x', keys: {} }), null);
  assert.equal(serializePushSubscription({ keys: { p256dh: 'a', auth: 'b' } }), null);
});

test('banner shows only for signed-in supported browsers still on "default"', () => {
  const base = { supported: true, permission: 'default', signedIn: true, asked: false };
  assert.equal(shouldShowPushPrompt(base), true);
  assert.equal(shouldShowPushPrompt({ ...base, asked: true }), false);
  assert.equal(shouldShowPushPrompt({ ...base, permission: 'granted' }), false);
  assert.equal(shouldShowPushPrompt({ ...base, permission: 'denied' }), false);
  assert.equal(shouldShowPushPrompt({ ...base, signedIn: false }), false);
  assert.equal(shouldShowPushPrompt({ ...base, supported: false }), false);
});
