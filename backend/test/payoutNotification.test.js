// Run with: npm test (from the backend directory).
// Pure tests: no Firebase, Resend or network dependency.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { notifySellerPayoutSent } = require('../src/services/payoutNotification');
const {
  PAYOUT_SENT_SUBJECT,
  buildPayoutSentMessage,
  payoutPhoneLast4,
} = require('../src/utils/payoutSentCopy');

test('payout notice uses the exact requested wording', () => {
  assert.equal(PAYOUT_SENT_SUBJECT, 'Your eHub Market payout has been sent');
  assert.equal(
    buildPayoutSentMessage({ amount: 12500, last4: '5678' }),
    'Your payout of KES 12,500 has been sent to your M-Pesa number ending in 5678. Check your M-Pesa.'
  );
});

test('last four digits come from the payout phone, with a safe fallback', () => {
  assert.equal(payoutPhoneLast4('+254 712 345 678'), '5678');
  assert.equal(payoutPhoneLast4('0712345678'), '5678');
  assert.equal(payoutPhoneLast4(''), '****');
});

test('seller is notified by email and in-app with the same message', async () => {
  const calls = [];
  const result = await notifySellerPayoutSent({
    uid: 'sellerUid',
    orderId: 'orderUid',
    amount: 7500,
    phoneNumber: '0712345678',
    sellerName: 'Jane',
    listingTitle: 'eFootball account',
    sendEmail: async (payload) => {
      calls.push(['email', payload]);
      return { status: 'sent' };
    },
    createNotification: async (payload) => {
      calls.push(['notification', payload]);
      return { id: 'notifUid' };
    },
  });

  const expectedMessage =
    'Your payout of KES 7,500 has been sent to your M-Pesa number ending in 5678. Check your M-Pesa.';
  assert.deepEqual(calls.map(([channel]) => channel), ['email', 'notification']);
  assert.equal(result.last4, '5678');
  assert.equal(calls[0][1].uid, 'sellerUid');
  assert.equal(calls[0][1].orderId, 'orderUid');
  assert.equal(calls[0][1].amount, 7500);
  assert.equal(calls[0][1].last4, '5678');
  assert.equal(calls[0][1].sellerName, 'Jane');
  assert.equal(calls[0][1].listingTitle, 'eFootball account');
  assert.deepEqual(calls[1][1], {
    userId: 'sellerUid',
    title: 'Payout Sent',
    message: expectedMessage,
    type: 'payment',
    orderId: 'orderUid',
  });
});

test('a failed email does not block the in-app notice or reject the payout', async () => {
  const notifications = [];
  const result = await notifySellerPayoutSent({
    uid: 'sellerUid',
    orderId: 'orderUid',
    amount: 1000,
    phoneNumber: '254712345678',
    sendEmail: async () => {
      throw new Error('Resend down');
    },
    createNotification: async (payload) => {
      notifications.push(payload);
      return { id: 'notifUid' };
    },
  });

  assert.equal(result.email, null);
  assert.equal(result.notification.id, 'notifUid');
  assert.equal(notifications.length, 1);
});

test('missing identifiers skip all side effects', async () => {
  let called = 0;
  const result = await notifySellerPayoutSent({
    uid: '',
    orderId: 'orderUid',
    sendEmail: async () => { called += 1; },
    createNotification: async () => { called += 1; },
  });
  assert.equal(result.status, 'skipped');
  assert.equal(called, 0);
});
