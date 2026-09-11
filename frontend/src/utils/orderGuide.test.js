import test from 'node:test';
import assert from 'node:assert/strict';
import { buyerGuide, sellerGuide, payoutLabelFor, GUIDE_TONES } from './orderGuide.js';

test('buyer: pending payment tells buyer to pay via Paystack', () => {
  const g = buyerGuide({ status: 'pending_payment' });
  assert.equal(g.title, 'PAYMENT PENDING');
  assert.match(g.next, /Paystack/);
  assert.equal(g.whoActs, 'You');
});

test('buyer: payment confirmed holds funds and notifies seller', () => {
  const g = buyerGuide({ status: 'payment_confirmed' });
  assert.match(g.title, /PAYMENT CONFIRMED/);
  assert.match(g.whatHappened, /payment has been received/);
  assert.match(g.next, /seller has been notified/);
  assert.equal(g.whoActs, 'Seller');
});

test('buyer: waiting for seller explains next step', () => {
  const g = buyerGuide({ status: 'awaiting_seller_delivery' });
  assert.equal(g.title, 'WAITING FOR SELLER');
  assert.equal(g.whoActs, 'Seller');
});

test('buyer: credentials received shows both possible actions', () => {
  const g = buyerGuide({ status: 'credentials_submitted' });
  assert.match(g.title, /ACCOUNT DETAILS RECEIVED/);
  assert.match(g.next, /Confirm delivery/i);
  assert.match(g.next, /Raise a dispute/i);
  assert.equal(g.whoActs, 'You');
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
  assert.equal(g.title, 'BUYER PAID \u2705');
  assert.match(g.whatHappened, /Payment has been confirmed/);
  assert.match(g.next, /credentials/);
  assert.equal(g.whoActs, 'You');
  assert.equal(g.ctaLabel, 'Submit Account Details');
});

test('seller: credentials sent means waiting on buyer', () => {
  const g = sellerGuide({ status: 'credentials_submitted' });
  assert.match(g.title, /ACCOUNT DETAILS SENT/);
  assert.match(g.next, /buyer confirms delivery/);
  assert.equal(g.whoActs, 'Buyer');
});

test('seller: dispute holds payout, never claims money was sent', () => {
  const g = sellerGuide({ status: 'disputed' });
  assert.match(g.title, /DISPUTE RAISED/);
  assert.match(g.next, /payout is on hold/);
  assert.doesNotMatch(g.next, /money.*sent|payout.*paid/i);
});

test('seller: completed reports the *actual* payout status', () => {
  const g = sellerGuide({ status: 'completed', escrowStatus: 'released' });
  assert.match(g.title, /ORDER COMPLETED/);
  assert.match(g.next, /Payout status: Released — payout pending/);
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