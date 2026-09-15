// eHub Kenya transactional email service (Resend).
//
// Rules enforced here:
//   - Emails are only triggered from backend events AFTER the order/drop state
//     change has been persisted (controllers call these; failures never bubble).
//   - Idempotent: each event carries a stable key (e.g. seller-payment-confirmed-<orderId>)
//     recorded in Firestore `emailEvents`. A claimed/sent event is never resent.
//   - Sensitive data (login passwords, API keys, eHub credentials) is NEVER emailed.
//   - Only safe metadata is logged (type, orderId, recipient, status).
//   - Without RESEND_API_KEY configured, senders skip silently so development
//     and order flows stay unbroken.

const { Resend } = require('resend');
const { admin, adminDb } = require('./firebaseAdmin');
const { getSellerOrderGuidePdf } = require('./sellerGuidePdf');
const logger = require('../utils/logger');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'eHub Kenya';
const { FRONTEND_URL } = require('../config');

const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const formatKES = (amount) => `KES ${Number(amount || 0).toLocaleString('en-KE')}`;

function orderUrl(order) {
  const id = (order && order.id) || '';
  return `${FRONTEND_URL}/orders/${id}`;
}

async function getUserEmail(uid) {
  if (!uid) return null;
  try {
    const snap = await adminDb.doc(`users/${uid}`).get();
    return (snap.exists && snap.data().email) || null;
  } catch (err) {
    logger.warn(`getUserEmail lookup failed for ${uid}: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

async function claimEvent(eventKey) {
  const ref = adminDb.doc(`emailEvents/${eventKey}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) throw new Error('EVENT_ALREADY_NOTIFIED');
      tx.set(ref, { eventKey, status: 'sending', claimedAt: new Date().toISOString() });
    });
    return true;
  } catch (err) {
    if (err.code === 'already-exists' || err.message === 'EVENT_ALREADY_NOTIFIED') return false;
    return false;
  }
}

async function runWithIdempotency(eventKey, sendFn) {
  if (!resend) {
    logger.warn(`email skipped (RESEND_API_KEY not set): ${eventKey}`);
    return { status: 'not_configured' };
  }
  if (!(await claimEvent(eventKey))) {
    logger.info(`email skipped (already handled): ${eventKey}`);
    return { status: 'skipped' };
  }
  try {
    const result = await sendFn();
    if (result && result.error) {
      throw new Error(result.error.message || 'Resend error');
    }
    await adminDb.doc(`emailEvents/${eventKey}`).update({
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
    logger.info(`email sent: ${eventKey}`);
    return { status: 'sent' };
  } catch (err) {
    await adminDb.doc(`emailEvents/${eventKey}`).delete().catch(() => {});
    logger.error(`email failed: ${eventKey} — ${err.message}`);
    return { status: 'failed' };
  }
}

function sendRaw({ to, subject, html, text, attachments }) {
  return resend.emails.send({ from: FROM, to, subject, html, text, attachments });
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function renderLayout({ eyebrow, title, bodyHtml, cta, footnote }) {
  const ctaHtml = cta
    ? `<div style="margin:26px 0 6px;text-align:center;">
         <a href="${cta.url}" style="background-color:#003BFF;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;display:inline-block;">${cta.label}</a>
       </div>
       <p style="font-size:11px;color:#9CA3AF;text-align:center;margin:8px 0 0;">${cta.hint || ''}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background-color:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F5F7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0E0E10;border-radius:14px 14px 0 0;">
        <tr>
          <td style="padding:22px 28px;">
            <span style="color:#FFFFFF;font-size:19px;font-weight:800;letter-spacing:0.5px;">eFootball <span style="color:#FFF100;">Hub</span></span>
            <span style="color:#9CA3AF;font-size:13px;font-weight:600;margin-left:8px;letter-spacing:2px;">KENYA</span>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FFFFFF;border-radius:0 0 14px 14px;">
        <tr><td style="padding:28px 28px 20px;">
          ${eyebrow ? `<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#003BFF;text-transform:uppercase;margin:0 0 8px;">${esc(eyebrow)}</p>` : ''}
          <h1 style="font-size:21px;color:#171717;margin:0 0 14px;line-height:1.3;">${esc(title)}</h1>
          <div style="font-size:14.5px;color:#374151;line-height:1.65;">${bodyHtml}</div>
          ${ctaHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #EEF0F3;">
          <p style="font-size:11.5px;color:#9CA3AF;margin:0 0 6px;line-height:1.5;">${footnote || ""}</p>
          <p style="font-size:10.5px;color:#C4C9D0;margin:0;line-height:1.5;">You received this email because you are a member of eHub Kenya. Please do not reply to this automated email — reach out inside your order chat instead.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Shared content builders
// ---------------------------------------------------------------------------

const bodyP = (text) => `<p style="margin:0 0 12px;color:#374151;">${text}</p>`;
const bodyStrong = (text) => `<strong style="color:#171717;">${text}</strong>`;
const bodyList = (items) =>
  `<ul style="margin:0 0 14px;padding-left:20px;">
     ${items.map((i) => `<li style="margin-bottom:7px;">${i}</li>`).join('')}
   </ul>`;
const bodyBox = (text) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
     <tr><td style="background:#F3F5FF;border-left:4px solid #003BFF;border-radius:8px;padding:12px 14px;font-size:13.5px;color:#222;">
       ${text}</td></tr>
   </table>`;

function orderCta(order, label, hint = '') {
  return { url: orderUrl(order), label, hint };
}

// ---------------------------------------------------------------------------
// Event senders (idempotent, non-throwing)
// ---------------------------------------------------------------------------

// Buyer: payment confirmed
async function sendBuyerPaymentConfirmedEmail(order) {
  if (!order || !order.buyerEmail) return;
  const key = `buyer-payment-confirmed-${order.id}`;
  await runWithIdempotency(key, async () => {
    const title = `Payment Confirmed for "${esc(order.listingTitle || 'your purchase')}"`;
    const bodyHtml =
      bodyP(`Hi ${esc(order.buyerDisplayName || 'there')},`) +
      bodyP(`Your payment of ${bodyStrong(formatKES(order.amount))} has been confirmed via ${esc(order.paymentChannel || 'Paystack')}.`) +
      bodyP(`The seller has been notified and will submit the account login details on your order page. Once they do, you can verify the account and confirm delivery.`) +
      bodyBox(bodyStrong(`What to do now:`)+`<br>1) Sign in to verify the account works.<br>2) Then click “Confirm Delivery” to release funds to the seller.`) +
      bodyP(`If anything looks wrong, raise a dispute from your order page and admin will review it right away.`);
    return sendRaw({
      to: order.buyerEmail,
      subject: `✅ Payment Confirmed`,
      html: renderLayout({
        eyebrow: 'Payment Received',
        title,
        bodyHtml,
        cta: orderCta(order, 'View Your Order'),
        footnote: `Order ${order.id} · ${formatKES(order.amount)} — account login details never appear in this email.`,
      }),
      text: `Payment confirmed for ${formatKES(order.amount)}. View your order: ${orderUrl(order)}`,
    });
  });
}

// Seller: buyer paid (most important — includes the seller guide PDF)
async function sendSellerPaymentReceivedEmail(order) {
  if (!order) return;
  const sellerEmail = await getUserEmail(order.sellerId);
  if (!sellerEmail) {
    logger.warn(`seller-payment email skipped (no email on user ${order.sellerId}): ${order.id}`);
    return;
  }
  const key = `seller-payment-confirmed-${order.id}`;
  await runWithIdempotency(key, async () => {
    const pdfBuffer = await getSellerOrderGuidePdf();
    const attachments = pdfBuffer
      ? [{ filename: 'eHub Seller Order Guide.pdf', content: pdfBuffer, contentType: 'application/pdf' }]
      : undefined;
    const title = `New Paid Order — "${esc(order.listingTitle || 'your listing')}"`;
    const bodyHtml =
      bodyP(`Hi ${esc(order.sellerDisplayName || 'there')},`) +
      bodyP(`A buyer just paid ${bodyStrong(formatKES(order.amount))} for your account. Complete the order to get paid.`) +
      bodyBox(
        bodyStrong(`Your steps:`)+`<br>1) Open the order and read any buy notes.<br>2) Sign into the account yourself to confirm the login works.<br>3) Submit the account email and password in the “Submit Account Details” box.<br>4) Wait for the buyer to verify, then admin releases your payout to your registered payout phone.`
      ) +
      bodyP(`The attached ${bodyStrong('eHub Seller Order Guide (PDF)')} walks you through all 6 steps.`) +
      bodyP(`Payout is processed by admin to your registered payout phone — never share your payout details, eHub password, or the account password anywhere except the private order page.`);
    return sendRaw({
      to: sellerEmail,
      subject: `🔔 New Paid Order — ${formatKES(order.amount)}`,
      html: renderLayout({
        eyebrow: 'Payment Received',
        title,
        bodyHtml,
        cta: orderCta(order, 'Submit Account Details', 'You must be signed in to open the order page.'),
        footnote: `Order ${order.id} · ${formatKES(order.amount)} · Seller guide attached as a PDF.`,
      }),
      text: `A buyer paid ${formatKES(order.amount)} for your listing. Submit the account details from the order page: ${orderUrl(order)}`,
      attachments,
    });
  });
}

// Seller: credentials submitted
async function sendSellerCredentialsSubmittedEmail(order) {
  if (!order) return;
  const sellerEmail = await getUserEmail(order.sellerId);
  if (!sellerEmail) return;
  const key = `seller-credentials-submitted-${order.id}`;
  await runWithIdempotency(key, async () => {
    const title = `Account Details Submitted — "${esc(order.listingTitle || 'your listing')}"`;
    const bodyHtml =
      bodyP(`Hi ${esc(order.sellerDisplayName || 'there')},`) +
      bodyP(`You submitted the buyer's account login details. The buyer is now verifying the account.`) +
      bodyP(`All that's left is the buyer confirming delivery. Once they do, escrow is released and your payout moves to admin processing.`) +
      bodyBox(`Keep an eye on the order chat. If the buyer hits any problem, answer in the private order chat — never outside the order page.`);
    return sendRaw({
      to: sellerEmail,
      subject: `📩 Account Details Submitted`,
      html: renderLayout({
        eyebrow: 'Order Update',
        title,
        bodyHtml,
        cta: orderCta(order, 'Track Your Order'),
        footnote: `Order ${order.id} · ${formatKES(order.amount)} · payout pending buyer confirmation.`,
      }),
      text: `Account details submitted for order ${order.id}. Track the order: ${orderUrl(order)}`,
    });
  });
}

// Buyer: credentials ready (never include the password)
async function sendBuyerCredentialsReadyEmail(order) {
  if (!order || !order.buyerEmail) return;
  const key = `buyer-credentials-ready-${order.id}`;
  await runWithIdempotency(key, async () => {
    const title = `Account Ready — Verify & Confirm Delivery`;
    const bodyHtml =
      bodyP(`Hi ${esc(order.buyerDisplayName || 'there')},`) +
      bodyP(`The seller submitted the login details for "${esc(order.listingTitle || 'your purchase')}".`) +
      bodyBox(
        bodyStrong(`Your login is on the order page only.`)+`<br>It is never emailed, so open your order to view it, then: 1) Sign in to verify the account, 2) Confirm delivery to release the seller's payment.`
      ) +
      bodyP(`Your eFootball password is ${bodyStrong('never')} included in this email or anywhere in public chat. If the account doesn't match the listing, raise a dispute from the order page.`);
    return sendRaw({
      to: order.buyerEmail,
      subject: `🔐 Account Ready — Verify Now`,
      html: renderLayout({
        eyebrow: 'Order Update',
        title,
        bodyHtml,
        cta: orderCta(order, 'View Login & Verify'),
        footnote: `Order ${order.id} · login details are only visible on the private order page.`,
      }),
      text: `Seller submitted account login details for your order. View them on the order page (never emailed): ${orderUrl(order)}`,
    });
  });
}

// Buyer + seller: order completed (escrow released)
async function sendOrderCompletedEmail(order) {
  const sellerEmail = await getUserEmail(order.sellerId);
  const tasks = [];

  if (order.buyerEmail) {
    tasks.push(runWithIdempotency(`buyer-order-completed-${order.id}`, async () => {
      const title = `Order Completed — "${esc(order.listingTitle || 'your purchase')}"`;
      const bodyHtml =
        bodyP(`Hi ${esc(order.buyerDisplayName || 'there')},`) +
        bodyP(`Your order is now ${bodyStrong('complete')}. Thank you for shopping with eHub Kenya.`) +
        bodyP(`If you run into any issue with the account later, use the order page to reach the seller or raise a dispute.`);
      return sendRaw({
        to: order.buyerEmail,
        subject: `Order Completed`,
        html: renderLayout({
          eyebrow: 'Order Complete',
          title,
          bodyHtml,
          cta: orderCta(order, 'View Your Order'),
          footnote: `Order ${order.id} · keep this order page accessible for future support.`,
        }),
        text: `Your order ${order.id} is complete. View it: ${orderUrl(order)}`,
      });
    }));
  }

  if (sellerEmail) {
    tasks.push(runWithIdempotency(`seller-order-completed-${order.id}`, async () => {
      const title = `Escrow Released — Payout Pending`;
      const bodyHtml =
        bodyP(`Hi ${esc(order.sellerDisplayName || 'there')},`) +
        bodyP(`The buyer confirmed delivery for "${esc(order.listingTitle || 'your listing')}".`) +
        bodyP(`Your payment of ${bodyStrong(formatKES(order.amount))} has been ${bodyStrong('released from escrow')} and is now being processed by admin to your registered payout phone.`) +
        bodyBox(`Payout is processed manually to your payout phone. If your payout phone number changed, update it in your seller profile so admin can pay you without delay.`);
      return sendRaw({
        to: sellerEmail,
        subject: `Escrow Released — Payout Pending`,
        html: renderLayout({
          eyebrow: 'Funds Released',
          title,
          bodyHtml,
          cta: orderCta(order, 'View Your Order'),
          footnote: `Order ${order.id} · ${formatKES(order.amount)} released to seller.`,
        }),
        text: `Escrow released for order ${order.id}. Payout to your payout phone is pending admin processing. ${orderUrl(order)}`,
      });
    }));
  }

  await Promise.all(tasks);
}

// Buyer + seller: order refunded (non-dispute admin refund)
async function sendOrderRefundedEmail(order) {
  const sellerEmail = await getUserEmail(order.sellerId);
  const tasks = [];

  if (order.buyerEmail) {
    tasks.push(runWithIdempotency(`buyer-order-refunded-${order.id}`, async () => {
      const title = `Your Order Was Refunded`;
      const bodyHtml =
        bodyP(`Hi ${esc(order.buyerDisplayName || 'there')},`) +
        bodyP(`Your payment of ${bodyStrong(formatKES(order.amount))} for "${esc(order.listingTitle || 'your order')}" is being ${bodyStrong('refunded to your payment method')}.`) +
        bodyP(`Refunds are processed manually and typically appear within a few business days. If the listing appears again in the marketplace, that is normal — the account went back on sale.`);
      return sendRaw({
        to: order.buyerEmail,
        subject: `Order Refunded`,
        html: renderLayout({
          eyebrow: 'Order Update',
          title,
          bodyHtml,
          cta: orderCta(order, 'View Your Order'),
          footnote: `Order ${order.id} · refund handled by admin.`,
        }),
        text: `Your order ${order.id} was refunded. Details: ${orderUrl(order)}`,
      });
    }));
  }

  if (sellerEmail) {
    tasks.push(runWithIdempotency(`seller-order-refunded-${order.id}`, async () => {
      const title = `Order Refunded — Listing Relisted`;
      const bodyHtml =
        bodyP(`Hi ${esc(order.sellerDisplayName || 'there')},`) +
        bodyP(`The order "${esc(order.listingTitle || 'your listing')}" was refunded to the buyer by admin.`) +
        bodyP(`Your listing is live again in the marketplace, so it can be sold to another buyer.`);
      return sendRaw({
        to: sellerEmail,
        subject: `Order Refunded`,
        html: renderLayout({
          eyebrow: 'Order Update',
          title,
          bodyHtml,
          cta: orderCta(order, 'View Your Order'),
          footnote: `Order ${order.id} · listing relisted.`,
        }),
        text: `Order ${order.id} was refunded and your listing is live again. ${orderUrl(order)}`,
      });
    }));
  }

  await Promise.all(tasks);
}

// Dispute raised: seller alert + buyer confirmation
async function sendDisputeRaisedEmail(order) {
  if (!order) return;
  const sellerEmail = await getUserEmail(order.sellerId);
  const tasks = [];

  if (sellerEmail) {
    tasks.push(runWithIdempotency(`seller-dispute-raised-${order.id}`, async () => {
      const title = `Dispute Raised — Your Payout Is On Hold`;
      const bodyHtml =
        bodyP(`Hi ${esc(order.sellerDisplayName || 'there')},`) +
        bodyP(`A buyer raised a dispute on "${esc(order.listingTitle || 'your listing')}".`) +
        bodyBox(bodyStrong(`Reason:`)+` ${esc(order.disputeReason || 'Not provided')}`) +
        bodyP(`The payment is ${bodyStrong('frozen in escrow')} while admin reviews the case. Reply in the private order chat with any evidence — the chat is the record admin reviews.`);
      return sendRaw({
        to: sellerEmail,
        subject: `⚠️ Dispute Raised — Payment On Hold`,
        html: renderLayout({
          eyebrow: 'Dispute',
          title,
          bodyHtml,
          cta: orderCta(order, 'View Order & Reply'),
          footnote: `Order ${order.id} · funds frozen until the dispute is resolved.`,
        }),
        text: `A dispute was raised on order ${order.id}. Payment is on hold. Reply in the order chat: ${orderUrl(order)}`,
      });
    }));
  }

  if (order.buyerEmail) {
    tasks.push(runWithIdempotency(`buyer-dispute-submitted-${order.id}`, async () => {
      const title = `Dispute Submitted — We're On It`;
      const bodyHtml =
        bodyP(`Hi ${esc(order.buyerDisplayName || 'there')},`) +
        bodyP(`Your dispute on "${esc(order.listingTitle || 'your order')}" has been submitted.`) +
        bodyP(`No funds move while a dispute is open — admin will review the order chat and resolve it. You can add messages to the chat at any time; they're part of the case record.`);
      return sendRaw({
        to: order.buyerEmail,
        subject: `🛡️ Dispute Submitted`,
        html: renderLayout({
          eyebrow: 'Dispute',
          title,
          bodyHtml,
          cta: orderCta(order, 'View Your Order'),
          footnote: `Order ${order.id} · escrow frozen during review.`,
        }),
        text: `Your dispute on order ${order.id} was submitted. No funds move while it's being reviewed. ${orderUrl(order)}`,
      });
    }));
  }

  await Promise.all(tasks);
}

// Dispute resolved: outcome accurate to the stored resolution
async function sendDisputeResolvedEmail(order, { toRole, resolution }) {
  if (!order) return;
  const isRelease = resolution === 'release' || resolution === 'released_to_seller' || resolution === 'seller';
  const releaseKey = toRole === 'seller' ? `seller-dispute-resolved-${order.id}` : `buyer-dispute-resolved-${order.id}`;
  const recipientEmail = toRole === 'seller' ? await getUserEmail(order.sellerId) : order.buyerEmail;
  if (!recipientEmail) return;

  await runWithIdempotency(releaseKey, async () => {
    const toSeller = toRole === 'seller';
    let title, bodyHtml;
    if (toSeller) {
      if (isRelease) {
        title = `Dispute Resolved — Payout Pending`;
        bodyHtml =
          bodyP(`Hi ${esc(order.sellerDisplayName || 'there')},`) +
          bodyP(`The dispute on "${esc(order.listingTitle || 'your listing')}" was resolved in your favour.`) +
          bodyP(`Your payment of ${bodyStrong(formatKES(order.amount))} was ${bodyStrong('released from escrow')}. Admin will process the payout to your registered payout phone.`) +
          bodyBox(`Payout is processed manually to your payout phone. Keep the number on your seller profile up to date.`);
      } else {
        title = `Dispute Resolved — Order Refunded`;
        bodyHtml =
          bodyP(`Hi ${esc(order.sellerDisplayName || 'there')},`) +
          bodyP(`The dispute on "${esc(order.listingTitle || 'your listing')}" was resolved in the buyer's favour.`) +
          bodyP(`The order was ${bodyStrong('refunded')} and your listing is live again`);
      }
    } else {
      if (isRelease) {
        title = `Dispute Resolved — Order Complete`;
        bodyHtml =
          bodyP(`Hi ${esc(order.buyerDisplayName || 'there')},`) +
          bodyP(`Your dispute on "${esc(order.listingTitle || 'your order')}" was resolved in the seller's favour.`) +
          bodyP(`The order was completed and the payment released to the seller.`);
      } else {
        title = `Dispute Resolved — Refund Processed`;
        bodyHtml =
          bodyP(`Hi ${esc(order.buyerDisplayName || 'there')},`) +
          bodyP(`Your dispute on "${esc(order.listingTitle || 'your order')}" was resolved in your favour.`) +
          bodyP(`Your payment of ${bodyStrong(formatKES(order.amount))} is being ${bodyStrong('refunded to your payment method')}. Refunds are processed manually and typically appear within a few business days.`);
      }
    }
    return sendRaw({
      to: recipientEmail,
      subject: `🛡️ Dispute Resolved`,
      html: renderLayout({
        eyebrow: 'Dispute Resolved',
        title,
        bodyHtml,
        cta: orderCta(order, 'View Your Order'),
        footnote: `Order ${order.id} · resolution recorded by eHub admin.`,
      }),
      text: `Dispute on order ${order.id} resolved (${isRelease ? 'released to seller' : 'refunded'}). ${orderUrl(order)}`,
    });
  });
}

// Friday Drop: seller notification
async function sendFridayDropEmail(drop, sellerEmail, { live }) {
  if (!drop || !sellerEmail) return;
  const key = live ? `friday-drop-live-${drop.id}` : `friday-drop-scheduled-${drop.id}`;
  await runWithIdempotency(key, async () => {
    const title = live
      ? `Your Drop Is LIVE — "${esc(drop.title || 'your account')}"`
      : `Drop Scheduled — "${esc(drop.title || 'your account')}"`;
    const bodyHtml = live
      ? bodyP(`Hi ${esc(drop.sellerName || 'there')},`) +
        bodyP(`Your Friday Drop ${bodyStrong('is live right now')} on the eHub Kenya marketplace. Buyers can see it at ${bodyStrong(`${esc(drop.dropPrice || 0)} drop price`)} for the rest of today.`) +
        bodyP(`Sold? Complete the order from your seller dashboard exactly like a normal sale.`)
      : bodyP(`Hi ${esc(drop.sellerName || 'there')},`) +
        bodyP(`Your Friday Drop for "${esc(drop.title || 'your account')}" at ${bodyStrong(`${esc(drop.dropPrice || 0)} drop price`)} was submitted and ${bodyStrong('scheduled')}.`) +
        bodyP(`It goes live on the marketplace on ${bodyStrong(`Friday, ${esc(drop.fridayDateISO || '')}`)} (local East Africa time).`) +
        bodyP(`It will appear in the marketplace once approved by admin.`);
    return sendRaw({
      to: sellerEmail,
      subject: live ? `🔥 Your Drop Is Live!` : `🔥 Friday Drop Scheduled`,
      html: renderLayout({
        eyebrow: 'Friday Drops',
        title,
        bodyHtml,
        cta: {
          url: `${FRONTEND_URL}/friday-drops`,
          label: live ? 'View Live Drop' : 'View Friday Drops',
        },
        footnote: `Drop ${drop.id} · ${esc(drop.fridayDateISO || '')}`,
      }),
      text: `Friday Drop ${live ? 'is live now' : `scheduled for Friday ${drop.fridayDateISO}`}. ${FRONTEND_URL}/friday-drops`,
    });
  });
}

// Simple test email (admin-only).
async function sendTestEmail(to) {
  if (!resend) return { status: 'not_configured' };
  const key = `test-email-${to}-${Date.now()}`;
  return runWithIdempotency(key, async () => {
    return sendRaw({
      to,
      subject: `✅ eHub Kenya test email`,
      html: renderLayout({
        eyebrow: 'Configuration Test',
        title: 'Email delivery is working',
        bodyHtml: bodyP(`This is a test email from eHub Kenya. If you can read this, Resend delivery with sender <strong>${esc(FROM)}</strong> is configured correctly.`),
        footnote: 'Send a test email from your Command Center → Email settings.',
      }),
      text: 'eHub Kenya test email — Resend delivery works.',
    });
  });
}

module.exports = {
  sendBuyerPaymentConfirmedEmail,
  sendSellerPaymentReceivedEmail,
  sendSellerCredentialsSubmittedEmail,
  sendBuyerCredentialsReadyEmail,
  sendOrderCompletedEmail,
  sendOrderRefundedEmail,
  sendDisputeRaisedEmail,
  sendDisputeResolvedEmail,
  sendFridayDropEmail,
  sendTestEmail,
  getUserEmail,
};