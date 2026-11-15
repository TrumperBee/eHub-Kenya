import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ADMIN_WHATSAPP_NUMBER,
  ADMIN_WHATSAPP_URL,
  buildSellerPayoutAlertUrl,
  encodeWhatsAppText,
} from './whatsapp.js';

test('admin WhatsApp link uses the international number without a plus', () => {
  assert.equal(ADMIN_WHATSAPP_NUMBER, '254713079528');
  assert.equal(ADMIN_WHATSAPP_URL, 'https://wa.me/254713079528');
});

test('seller alert link follows the documented wa.me template', () => {
  const url = buildSellerPayoutAlertUrl({ sellerName: 'Victor', orderId: 'ord_123' });
  assert.equal(
    url,
    'https://wa.me/254713079528?text=Hello%20I%27m%20Victor%20just%20submitted%20my%20account%20details%20for%20order%20ord_123%20waiting%20for%20buyer%20confirmation%20and%20payment%20release'
  );
});

test('gamer tags with spaces and symbols are percent-encoded', () => {
  const url = buildSellerPayoutAlertUrl({ sellerName: 'King & Queen', orderId: 'ord_9' });
  assert.ok(url.includes('Hello%20I%27m%20King%20%26%20Queen%20just%20submitted'));
  assert.ok(!url.includes('&Queen'));
  assert.ok(!url.includes(' '));
});

test('missing profile name falls back to a readable placeholder', () => {
  const url = buildSellerPayoutAlertUrl({ orderId: 'ord_1' });
  assert.ok(url.includes('Hello%20I%27m%20a%20seller%20just%20submitted'));
});

test('missing order id never produces "undefined"', () => {
  const url = buildSellerPayoutAlertUrl({ sellerName: 'Victor' });
  assert.ok(url.includes('for%20order%20my%20order%20waiting'));
  assert.ok(!url.includes('undefined'));
});

test('encodeWhatsAppText escapes apostrophes like the template', () => {
  assert.equal(encodeWhatsAppText("I'm here"), 'I%27m%20here');
  assert.equal(encodeWhatsAppText(''), '');
  assert.equal(encodeWhatsAppText(undefined), '');
});
