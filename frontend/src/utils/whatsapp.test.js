import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ADMIN_WHATSAPP_NUMBER,
  ADMIN_WHATSAPP_URL,
  buildBuyerContactUrl,
  buildSellerContactUrl,
  buildSellerPayoutAlertUrl,
  canShowDirectContact,
  encodeWhatsAppText,
  normalizeWhatsAppNumber,
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

test('direct contact is blocked until escrow is active', () => {
  assert.equal(canShowDirectContact('awaiting_seller_delivery'), true);
  assert.equal(canShowDirectContact('completed'), true);
  assert.equal(canShowDirectContact('disputed'), true);

  // The whole point of the guard: no off-platform deal before payment.
  assert.equal(canShowDirectContact('pending_payment'), false);
  assert.equal(canShowDirectContact('credentials_submitted'), false);
  assert.equal(canShowDirectContact('cancelled'), false);
  assert.equal(canShowDirectContact(undefined), false);
});

test('Kenyan numbers are normalised to the international wa.me form', () => {
  assert.equal(normalizeWhatsAppNumber('+254712345678'), '254712345678');
  assert.equal(normalizeWhatsAppNumber('254712345678'), '254712345678');
  assert.equal(normalizeWhatsAppNumber('0712345678'), '254712345678');
  assert.equal(normalizeWhatsAppNumber('712345678'), '254712345678');
  assert.equal(normalizeWhatsAppNumber('0112345678'), '254112345678');
  assert.equal(normalizeWhatsAppNumber('+254 712 345 678'), '254712345678');
  assert.equal(normalizeWhatsAppNumber('254-712-345-678'), '254712345678');
});

test('non-Kenyan international numbers are passed through unchanged', () => {
  assert.equal(normalizeWhatsAppNumber('+44 7700 900123'), '447700900123');
});

test('missing or unusable numbers normalise to an empty string', () => {
  assert.equal(normalizeWhatsAppNumber(''), '');
  assert.equal(normalizeWhatsAppNumber('   '), '');
  assert.equal(normalizeWhatsAppNumber(null), '');
  assert.equal(normalizeWhatsAppNumber(undefined), '');
  assert.equal(normalizeWhatsAppNumber('no number'), '');
  assert.equal(normalizeWhatsAppNumber('12345'), '');
});

test('buyer -> seller link follows the documented wa.me template', () => {
  const url = buildBuyerContactUrl({
    sellerWhatsapp: '0712345678',
    orderId: 'ord_123',
    listingTitle: 'ST 96 CF',
  });
  assert.equal(
    url,
    'https://wa.me/254712345678?text=Hi%20I%27m%20the%20buyer%20for%20order%20ord_123%20on%20eHub%20Market%20regarding%20ST%2096%20CF'
  );
});

test('seller -> buyer link follows the documented wa.me template', () => {
  const url = buildSellerContactUrl({
    buyerPhone: '+254 712 345 678',
    orderId: 'ord_123',
    listingTitle: 'ST 96 CF',
  });
  assert.equal(
    url,
    'https://wa.me/254712345678?text=Hi%20I%27m%20the%20seller%20for%20your%20order%20ord_123%20on%20eHub%20Market%20regarding%20ST%2096%20CF'
  );
});

test('links are null when the other party has no WhatsApp number', () => {
  assert.equal(buildBuyerContactUrl({ orderId: 'ord_1', listingTitle: 'X' }), null);
  assert.equal(buildBuyerContactUrl({ sellerWhatsapp: '', orderId: 'ord_1' }), null);
  assert.equal(buildSellerContactUrl({ orderId: 'ord_1', listingTitle: 'X' }), null);
  assert.equal(buildSellerContactUrl({ buyerPhone: 'n/a', orderId: 'ord_1' }), null);
});

test('missing order details never leak "undefined" into the message', () => {
  const url = buildBuyerContactUrl({ sellerWhatsapp: '254712345678' });
  assert.ok(url.includes('order%20my%20order%20on'));
  assert.ok(url.includes('regarding%20your%20listing'));
  assert.ok(!url.includes('undefined'));
});
