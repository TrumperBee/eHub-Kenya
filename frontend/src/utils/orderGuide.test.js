import test from 'node:test';
import assert from 'node:assert/strict';
import { buyerGuide, sellerGuide, payoutLabelFor, GUIDE_TONES } from './orderGuide.js';

test('buyer: pending payment tells buyer to pay via Paystack', () => {
  const g = buyerGuide({ status: 'pending_payment' });
  assert.equal(g.title, 'PAYMENT PENDING');
  assert.equal(g.whatHappened, 'Your order has been created, but payment has not been completed.');
  assert.equal(g.next, 'Complete your payment through Paystack to continue.');
  assert.equal(g.whoActs, 'You');
  assert.equal(g.ctaLabel, 'Continue to Pay');
});

test('buyer: paid-but-unadvanced doc never shows PAYMENT PENDING', () => {
  const g = buyerGuide({ status: 'pending_payment', paymentStatus: 'paid' });
  assert.notEqual(g.title, 'PAYMENT PENDING');
  assert.equal(g.title, 'WAITING FOR SELLER');
  assert.match(g.paymentConfirmedBadge, /PAYMENT CONFIRMED/);
});

test('buyer: payment confirmed holds funds and notifies seller', () => {
  const g = buyerGuide({ status: 'payment_confirmed' });
  assert.match(g.title, /PAYMENT CONFIRMED/);
  assert.match(g.whatHappened, /funds.*held securely/);
  assert.equal(g.next, 'The seller must submit the account details.');
  assert.equal(g.whoActs, 'Seller');
});

test('buyer: waiting for seller shows confirmed badge and explains next step', () => {
  const g = buyerGuide({ status: 'awaiting_seller_delivery' });
  assert.equal(g.title, 'WAITING FOR SELLER');
  assert.match(g.paymentConfirmedBadge, /PAYMENT CONFIRMED/);
  assert.match(g.whatHappened, /payment is confirmed/);
  assert.equal(g.whoActs, 'Seller');
  assert.equal(g.ctaLabel, 'Need help? Raise a dispute');
});

test('buyer: credentials received shows view/confirm/report actions', () => {
  const g = buyerGuide({ status: 'credentials_submitted' });
  assert.match(g.title, /ACCOUNT DETAILS RECEIVED/);
  assert.match(g.next, /Confirm delivery/i);
  assert.match(g.next, /Report a problem/i);
  assert.equal(g.whoActs, 'You');
  assert.equal(g.ctaLabel, 'View Account Details');
});

test('buyer: dispute puts payment on hold', () => {
  const g = buyerGuide({ status: 'disputed' });
  assert.match(g.title, /DISPUTE UNDER REVIEW/);
  assert.match(g.next, /on hold/);
  assert.equal(g.whoActs, 'eHub support');
});

test('buyer: completed suggests leaving a review', () => {
  const g = buyerGuide({ status: 'completed' });
  assert.match(g.title, /ORDER COMPLETED/);
  assert.match(g.next, /Leave a review/);
});

test('buyer: refunded is accurate about processing, not instant credit', () => {
  const g = buyerGuide({ status: 'refunded' });
  assert.match(g.next, /being processed/);
  assert.doesNotMatch(g.next, /refunded already|money sent/i);
});

test('seller: buyer paid requires submitting credentials', () => {
  const g = sellerGuide({ status: 'awaiting_seller_delivery' });
  assert.equal(g.title, 'PAYMENT RECEIVED \u2705');
  assert.equal(g.statusLabel, 'ACCOUNT DETAILS REQUIRED');
  assert.match(g.whatHappened, /held securely in escrow/);
  assert.match(g.next, /never in public chat or email/);
  assert.equal(g.whoActs, 'You');
  assert.equal(g.ctaLabel, 'Submit Account Details');
});

test('seller: credentials submitted means waiting on buyer', () => {
  const g = sellerGuide({ status: 'credentials_submitted' });
  assert.equal(g.title, 'ACCOUNT DETAILS SUBMITTED \u2705');
  assert.equal(g.statusLabel, 'WAITING FOR BUYER');
  assert.match(g.next, /moment they confirm delivery/);
  assert.equal(g.whoActs, 'Buyer');
});

test('seller: dispute holds payout, never claims money was sent', () => {
  const g = sellerGuide({ status: 'disputed' });
  assert.match(g.title, /PAYMENT ON HOLD/);
  assert.equal(g.statusLabel, 'DISPUTE OPEN');
  assert.match(g.whatHappened, /frozen in escrow/);
  assert.doesNotMatch(g.next, /money.*sent|payout.*paid/i);
});

test('seller: completed reports the *actual* payout status', () => {
  const g = sellerGuide({ status: 'completed', escrowStatus: 'released' });
  assert.equal(g.title, 'SALE COMPLETE \u2705');
  assert.equal(g.statusLabel, 'SALE COMPLETE');
  assert.match(g.next, /Payout status: Released — payout pending/);
  assert.match(g.next, /only marked released once the admin confirms/);
});

test('payout label never claims money already left the platform', () => {
  assert.equal(payoutLabelFor({ status: 'completed', escrowStatus: 'released' }), 'Released — payout pending');
  assert.equal(payoutLabelFor({ status: 'refunded' }), 'Refunded');
  assert.equal(payoutLabelFor({ status: 'awaiting_seller_delivery', escrowStatus: 'held' }), 'Held');
  assert.equal(payoutLabelFor({}), 'Pending');
});

test('guides cover every order status for both roles', () => {
  const statuses = ['pending_payment', 'payment_confirmed', 'awaiting_seller_delivery', 'in_transfer', 'credentials_submitted', 'disputed', 'completed', 'refunded', 'cancelled'];
  for (const s of statuses) {
    assert.ok(buyerGuide({ status: s }).title, `buyer guide missing for ${s}`);
    assert.ok(sellerGuide({ status: s }).title, `seller guide missing for ${s}`);
    assert.ok(Object.values(GUIDE_TONES).includes(buyerGuide({ status: s }).tone), `buyer tone missing for ${s}`);
  }
});