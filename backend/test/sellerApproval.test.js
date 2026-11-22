// Run with: node --test test/  (from the backend directory)
// Pure tests only: no Firebase, Resend, network or clock dependency.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { approveSellerApplication } = require('../src/services/sellerApproval');
const {
  WELCOME_SUBJECT,
  CONGRATULATIONS,
  HOW_IT_WORKS_STEPS,
  SELLER_RULES,
  FIRST_PAYOUT_COPY,
  WHATSAPP_URL,
  feeRule,
} = require('../src/utils/sellerApprovalCopy');
const { PLATFORM_FEE_RATE } = require('../src/utils/payouts');

function makeDeps() {
  const calls = [];
  return {
    calls,
    uid: 'sellerUid123',
    userRef: { update: async (data) => { calls.push(['user.update', data]); } },
    applicationRef: { update: async (data) => { calls.push(['application.update', data]); } },
    sendWelcome: async (payload) => { calls.push(['email', payload]); return { status: 'sent' }; },
    serverTimestamp: () => 'SERVER_TIME',
  };
}

test('approval persists both documents before sending the welcome email', async () => {
  const deps = makeDeps();
  const result = await approveSellerApplication({
    ...deps,
    adminUid: 'adminUid',
    sellerName: 'Jane',
  });

  assert.deepEqual(result, { uid: 'sellerUid123' });
  assert.deepEqual(deps.calls.map(([name]) => name), ['user.update', 'application.update', 'email']);
  assert.equal(deps.calls[0][1].sellerApproved, true);
  assert.equal(deps.calls[0][1].role, 'seller');
  assert.equal(deps.calls[0][1].sellerApprovedBy, 'adminUid');
  assert.equal(deps.calls[1][1].status, 'approved');
  assert.deepEqual(deps.calls[2][1], { uid: 'sellerUid123', sellerName: 'Jane' });
});

test('a failed user write prevents the welcome email', async () => {
  const deps = makeDeps();
  deps.userRef.update = async () => {
    deps.calls.push(['user.update', null]);
    throw new Error('write denied');
  };

  await assert.rejects(() => approveSellerApplication(deps), /write denied/);
  assert.equal(deps.calls.some(([name]) => name === 'email'), false);
  assert.equal(deps.calls.some(([name]) => name === 'application.update'), false);
});

test('a failed application write also prevents the welcome email', async () => {
  const deps = makeDeps();
  deps.applicationRef.update = async () => {
    deps.calls.push(['application.update', null]);
    throw new Error('application write denied');
  };

  await assert.rejects(() => approveSellerApplication(deps), /application write denied/);
  assert.equal(deps.calls.some(([name]) => name === 'email'), false);
});

test('invalid seller ids are rejected before any write or email', async () => {
  const deps = makeDeps();
  await assert.rejects(
    () => approveSellerApplication({ ...deps, uid: '../../evil' }),
    (err) => err.code === 'INVALID_SELLER_ID'
  );
  assert.equal(deps.calls.length, 0);
});

test('welcome copy has the requested subject, sections and seller rules', () => {
  assert.equal(WELCOME_SUBJECT, "🎉 You're approved as an eHub Market Seller!");
  assert.equal(
    CONGRATULATIONS,
    'Your seller account has been approved. You can now list eFootball accounts on eHub Market.'
  );
  assert.deepEqual(HOW_IT_WORKS_STEPS.map((step) => step.title), [
    'Post listing',
    'Buyer pays',
    'You receive order',
    'Submit credentials within 5 hours',
  ]);
  assert.equal(SELLER_RULES.length, 4);
  assert.match(SELLER_RULES.join(' '), /5 hours of payment confirmation/);
  assert.match(SELLER_RULES.join(' '), /3 warnings/);
  assert.match(SELLER_RULES.join(' '), /actually own and can deliver/);
  assert.match(SELLER_RULES.join(' '), /No fake listings/);
  assert.match(FIRST_PAYOUT_COPY, /M-Pesa number registered on your account within 24 hours/);
  assert.equal(WHATSAPP_URL, 'https://wa.me/254713079528');
});

test('fee copy follows the live payout rate instead of a stale hard-coded fee', () => {
  assert.equal(PLATFORM_FEE_RATE, 0, 'the fee holiday must stay in sync with this copy');
  assert.match(feeRule(), /no platform fee/i);

  const allCopy = `${WELCOME_SUBJECT} ${CONGRATULATIONS} ${SELLER_RULES.join(' ')} ${feeRule()}`;
  assert.doesNotMatch(allCopy, /5%/);
  assert.doesNotMatch(allCopy, /Paystack/i);
});
