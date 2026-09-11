// Admin-only email testing route for the development flow trace.
// POST /api/email/test            -> generic delivery check
// POST /api/email/test?type=...   -> send a real sample of a specific template

const { admin, adminDb } = require('../services/firebaseAdmin');
const {
  sendBuyerPaymentConfirmedEmail,
  sendBuyerCredentialsReadyEmail,
  sendOrderCompletedEmail,
  sendDisputeRaisedEmail,
  sendDisputeResolvedEmail,
  sendFridayDropEmail,
  sendTestEmail,
} = require('../services/emailService');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ochiengv250@gmail.com';

async function isAdmin(req) {
  if (!req.user || !req.user.email) return false;
  if (req.user.email === ADMIN_EMAIL) return true;
  try {
    const snap = await adminDb.doc('users/emails').get();
    return snap.exists && Array.isArray(snap.data().admins) && snap.data().admins.includes(req.user.email);
  } catch {
    return false;
  }
}

function sampleDrop(to, live) {
  return {
    id: live ? 'sample-live' : 'sample-scheduled',
    sellerName: 'Sample Seller',
    title: 'eFootball Account (SSR CF + Legend)',
    dropPrice: 6200,
    fridayDateISO: new Date().toISOString().slice(0, 10),
  };
}

function sampleOrder(to, resolution) {
  return {
    id: 'sample-order',
    buyerEmail: to,
    buyerDisplayName: 'Sample Buyer',
    sellerDisplayName: 'Sample Seller',
    listingTitle: 'ST 96 CF + 104 Edge Crosser | 1.1B GP',
    amount: 6200,
    paymentChannel: 'card',
    disputeReason: 'Account login does not match the listing description.',
    id_extra: resolution,
  };
}

async function sendTemplateSample(type, to) {
  switch (type) {
    case 'buyer_payment':
      return sendBuyerPaymentConfirmedEmail(sampleOrder(to));
    case 'credentials_ready':
      return sendBuyerCredentialsReadyEmail(sampleOrder(to));
    case 'order_completed':
      return sendOrderCompletedEmail({ ...sampleOrder(to), buyerEmail: to, sellerId: null });
    case 'dispute_submitted':
      return sendDisputeRaisedEmail({ ...sampleOrder(to), buyerEmail: to });
    case 'dispute_resolved':
      return sendDisputeResolvedEmail(sampleOrder(to), { toRole: 'buyer', resolution: 'release' });
    case 'drop_scheduled':
      return sendFridayDropEmail(sampleDrop(to, false), to, { live: false });
    case 'drop_live':
      return sendFridayDropEmail(sampleDrop(to, true), to, { live: true });
    default:
      return sendTestEmail(to);
  }
}

async function sendTest(req, res) {
  try {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    if (!process.env.RESEND_API_KEY) {
      return res.status(400).json({ success: false, error: 'RESEND_API_KEY is not set on this server' });
    }
    const to = String(req.body.to || '').trim() || ADMIN_EMAIL;
    const type = String(req.body.type || '').trim();
    const result = await sendTemplateSample(type, to);
    return res.json({
      success: true,
      to,
      type: type || 'generic',
      result,
      events: {},
    });
  } catch (err) {
    console.error('Email test error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { sendTest };