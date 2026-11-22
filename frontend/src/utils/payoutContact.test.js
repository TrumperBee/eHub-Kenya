import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdminSellerChatUrl,
  formatMpesaNumber,
  payoutPhoneOf,
  sellerChatPhoneOf,
  sellerDisplayNameOf,
  sellerUsernameOf,
} from './payoutContact.js';

test('M-Pesa numbers are shown in a readable 0712 345 678 form', () => {
  assert.equal(formatMpesaNumber('0712345678'), '0712 345 678');
  assert.equal(formatMpesaNumber('+254712345678'), '0712 345 678');
  assert.equal(formatMpesaNumber('254 712 345 678'), '0712 345 678');
  assert.equal(formatMpesaNumber('712345678'), '0712 345 678');
  assert.equal(formatMpesaNumber(''), '');
});

test('unrecognised numbers are not mangled', () => {
  assert.equal(formatMpesaNumber('+44 7700 900123'), '+44 7700 900123');
});

test('payout phone prefers the M-Pesa field, order snapshot is the fallback', () => {
  const order = { sellerPhone: '0700000001', sellerWhatsapp: '0700000002' };
  const profile = { phoneNumber: '0712345678', sellerWhatsapp: '0722000000' };
  assert.equal(payoutPhoneOf(order, profile), '0712345678');
  assert.equal(payoutPhoneOf(order, {}), '0700000001');
  assert.equal(payoutPhoneOf({}, { sellerWhatsapp: '0722000000' }), '0722000000');
  assert.equal(payoutPhoneOf({}, {}), '');
});

test('chat uses the WhatsApp number when one is published', () => {
  const order = { sellerPhone: '0700000001' };
  const profile = { phoneNumber: '0712345678', sellerWhatsapp: '0722000000' };
  assert.equal(sellerChatPhoneOf(order, profile), '0722000000');
  assert.equal(sellerChatPhoneOf(order, {}), '0700000001');
});

test('admin seller chat link uses wa.me with a payout opener', () => {
  const url = buildAdminSellerChatUrl({ phone: '0712345678', orderId: 'ORD123' });
  assert.ok(url.startsWith('https://wa.me/254712345678?text='));
  assert.match(decodeURIComponent(url), /payout for order ORD123/);
  assert.match(decodeURIComponent(url), /Please confirm receipt/);
  assert.equal(buildAdminSellerChatUrl({ phone: '' }), null);
});

test('seller identity falls back from display name to username', () => {
  const order = { sellerDisplayName: 'Jane at sale time' };
  assert.equal(sellerDisplayNameOf(order, { displayName: 'Jane', username: 'jane' }), 'Jane');
  assert.equal(sellerDisplayNameOf(order, {}), 'Jane at sale time');
  assert.equal(sellerDisplayNameOf({}, { username: 'jane' }), '@jane');
  assert.equal(sellerUsernameOf({ username: 'jane' }), '@jane');
  assert.equal(sellerDisplayNameOf({}, {}), 'Seller');
});
