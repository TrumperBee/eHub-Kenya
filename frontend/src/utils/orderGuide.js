// Phase 5 — "Every order state must answer":
//   1. What just happened?
//   2. What happens next?
//   3. Who needs to act?
//   4. What should they click?
//
// This file is the single source of truth for the short, contextual guidance shown
// on the buyer and seller order views. Wording must stay accurate to what the
// backend actually writes (payment confirmed / funds held pending completion /
// payout pending manual admin processing — there is no automated money movement).

export const GUIDE_TONES = {
  pending: 'pending',
  paid: 'paid',
  waiting: 'waiting',
  received: 'received',
  dispute: 'dispute',
  complete: 'complete',
  refunded: 'refunded',
  cancelled: 'cancelled',
};

// Accurate payout status for completed/refunded orders.
export function payoutLabelFor(order = {}) {
  if (order.escrowStatus === 'refunded' || order.status === 'refunded') return 'Refunded';
  if (order.status === 'completed') return 'Released — payout pending';
  if (order.escrowStatus === 'held') return 'Held';
  return 'Pending';
}

// ---------------------------------------------------------------------------
// BUYER
// ---------------------------------------------------------------------------

export function buyerGuide(order = {}) {
  // A payment that was actually completed but whose status never advanced is
  // resolved to the paid presentation — "PAYMENT PENDING" must only ever show
  // for orders where paymentStatus !== 'paid' AND status === 'pending_payment'.
  const status =
    order.status === 'pending_payment' && (order.paymentStatus === 'paid' || isPaid(order))
      ? 'awaiting_seller_delivery'
      : order.status;

  switch (status) {
    case 'pending_payment':
      return {
        tone: GUIDE_TONES.pending,
        title: 'PAYMENT PENDING',
        whatHappened: 'Your order has been created, but payment has not been completed.',
        next: 'Complete your payment through Paystack to continue.',
        whoActs: 'You',
        ctaLabel: 'Continue to Pay',
      };

    case 'payment_confirmed':
      return {
        tone: GUIDE_TONES.paid,
        title: 'PAYMENT CONFIRMED \u2705',
        whatHappened: 'Your payment has been verified and your funds are being held securely while the order is completed.',
        next: 'The seller must submit the account details.',
        whoActs: 'Seller',
        ctaLabel: 'Wait for the seller',
      };

    case 'awaiting_seller_delivery':
      return {
        tone: GUIDE_TONES.waiting,
        title: 'WAITING FOR SELLER',
        paymentConfirmedBadge: 'PAYMENT CONFIRMED \u2705',
        whatHappened: 'Your payment is confirmed and is being held securely. The seller has been notified and must now submit the account login details.',
        next: 'Wait for the seller to submit the account details.',
        whoActs: 'Seller',
        ctaLabel: 'Need help? Raise a dispute',
      };

    case 'in_transfer':
    case 'credentials_submitted':
      return {
        tone: GUIDE_TONES.received,
        title: 'ACCOUNT DETAILS RECEIVED \u2705',
        whatHappened: 'The seller has submitted the account login details. Log in to verify they match the listing.',
        next: 'Check that you can log in successfully. Everything correct? Confirm delivery to complete. Something wrong? Report a problem.',
        whoActs: 'You',
        ctaLabel: 'View Account Details',
      };

    case 'disputed':
      return {
        tone: GUIDE_TONES.dispute,
        title: 'DISPUTE UNDER REVIEW \ud83d\udee1\ufe0f',
        whatHappened: 'Your dispute was submitted to eHub support.',
        next: 'Your payment is on hold while eHub reviews the issue.',
        whoActs: 'eHub support',
        ctaLabel: 'Keep chatting below — it is used as evidence',
      };

    case 'completed':
      return {
        tone: GUIDE_TONES.complete,
        title: 'ORDER COMPLETED \u2705',
        whatHappened: 'The transaction has been completed.',
        next: 'Leave a review for the seller.',
        whoActs: 'You',
        ctaLabel: 'Leave a Review',
      };

    case 'refunded':
      return {
        tone: GUIDE_TONES.refunded,
        title: 'ORDER REFUNDED',
        whatHappened: 'The dispute was resolved in your favour.',
        next: 'Your refund is being processed back to your payment method.',
        whoActs: 'eHub support',
        ctaLabel: 'Check your payment method shortly',
      };

    case 'cancelled':
      return {
        tone: GUIDE_TONES.cancelled,
        title: 'ORDER CANCELLED',
        whatHappened: 'No payment was completed for this order.',
        next: 'You can make a fresh purchase anytime.',
        whoActs: 'You',
        ctaLabel: 'Browse listings',
      };

    default:
      return {
        tone: GUIDE_TONES.pending,
        title: (order.status || 'order').toUpperCase(),
        whatHappened: 'Check the order details below.',
        next: 'Follow the next step shown in this order.',
        whoActs: isPaid(order) ? 'Seller' : 'You',
        ctaLabel: 'Open this order',
      };
  }
}

// ---------------------------------------------------------------------------
// SELLER
// ---------------------------------------------------------------------------

export function sellerGuide(order = {}) {
  const status = order.status;
  switch (status) {
    case 'payment_confirmed':
    case 'awaiting_seller_delivery':
      return {
        tone: GUIDE_TONES.paid,
        title: 'BUYER PAID \u2705',
        whatHappened: 'Payment has been confirmed.',
        next: 'Submit the eFootball account credentials to the buyer.',
        whoActs: 'You',
        ctaLabel: 'Submit Account Details',
      };

    case 'in_transfer':
    case 'credentials_submitted':
      return {
        tone: GUIDE_TONES.waiting,
        title: 'ACCOUNT DETAILS SENT \u2705',
        whatHappened: 'The buyer is verifying the account.',
        next: "You'll be notified when the buyer confirms delivery.",
        whoActs: 'Buyer',
        ctaLabel: 'Wait for confirmation',
      };

    case 'disputed':
      return {
        tone: GUIDE_TONES.dispute,
        title: 'DISPUTE RAISED \u26a0\ufe0f',
        whatHappened: 'The buyer reported an issue with this order.',
        next: 'Your payout is on hold while the dispute is reviewed.',
        whoActs: 'eHub support',
        ctaLabel: 'Keep chatting below — it is used as evidence',
      };

    case 'completed':
      return {
        tone: GUIDE_TONES.complete,
        title: 'ORDER COMPLETED \u2705',
        whatHappened: 'The buyer confirmed delivery.',
        next: `Payout status: ${payoutLabelFor(order)}.`,
        whoActs: 'eHub support',
        ctaLabel: 'Review your order chat',
      };

    case 'refunded':
      return {
        tone: GUIDE_TONES.refunded,
        title: 'ORDER REFUNDED',
        whatHappened: 'The dispute was resolved in the buyer\u2019s favour.',
        next: 'No payout will be issued for this order.',
        whoActs: 'eHub support',
        ctaLabel: 'Order is closed',
      };

    case 'cancelled':
      return {
        tone: GUIDE_TONES.cancelled,
        title: 'ORDER CANCELLED',
        whatHappened: 'The buyer did not complete payment.',
        next: 'This order is closed. Your listing is unaffected.',
        whoActs: 'No one',
        ctaLabel: 'Back to your orders',
      };

    case 'pending_payment':
      return {
        tone: GUIDE_TONES.pending,
        title: 'AWAITING BUYER PAYMENT',
        whatHappened: 'A buyer created an order but has not paid yet.',
        next: 'You will be notified as soon as payment is confirmed.',
        whoActs: 'Buyer',
        ctaLabel: 'Wait for payment',
      };

    default:
      return {
        tone: GUIDE_TONES.pending,
        title: (order.status || 'order').toUpperCase(),
        whatHappened: 'Check the order details below.',
        next: 'Follow the next step shown in this order.',
        whoActs: isPaid(order) ? 'You' : 'Buyer',
        ctaLabel: 'Open this order',
      };
  }
}

function isPaid(order) {
  return ['payment_confirmed', 'awaiting_seller_delivery', 'in_transfer', 'credentials_submitted'].includes(order.status);
}