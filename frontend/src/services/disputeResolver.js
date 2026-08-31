export const DISPUTE_RESOLUTIONS = {
  release: {
    key: 'released_to_seller',
    label: 'Released to Seller',
    orderStatus: 'completed',
    escrowStatus: 'released',
  },
  refund: {
    key: 'refunded_to_buyer',
    label: 'Refunded to Buyer',
    orderStatus: 'refunded',
    escrowStatus: 'refunded',
  },
};

export const DISPUTE_RESOLUTION_KEYS = new Set([
  DISPUTE_RESOLUTIONS.release.key,
  DISPUTE_RESOLUTIONS.refund.key,
]);

export function formatKesLabel(amount) {
  const n = Number(amount) || 0;
  return `KES ${n.toLocaleString('en-US')}`;
}

function manualActionFor(resolutionKey, amount, buyerPhone, sellerPhone) {
  if (resolutionKey === DISPUTE_RESOLUTIONS.release.key) {
    return {
      type: 'release_payout',
      title: 'Manual M-Pesa payout to seller',
      detail: `Send ${formatKesLabel(amount)} to the seller${sellerPhone ? ` (${sellerPhone})` : ' (phone on record)'}. Confirm the transaction then mark the payout as sent.`,
    };
  }
  return {
    type: 'refund_reversal',
    title: 'Manual M-Pesa reversal to buyer',
    detail: `Send back ${formatKesLabel(amount)} to the buyer${buyerPhone ? ` (${buyerPhone})` : ' (phone on record)'}. Confirm the reversal then mark the refund as sent.`,
  };
}

/**
 * Pure builder: given an order, a resolution ('release' | 'refund'), an optional
 * actor, and contact details, returns the Firestore patch to apply, the system
 * message to post to the order chat, and the manual M-Pesa action the admin
 * must perform to complete the resolution.
 */
export function buildDisputeResolution(order, resolution, opts = {}) {
  const resolutionKey = DISPUTE_RESOLUTIONS[resolution]?.key;
  if (!resolutionKey) {
    throw new Error(`Unknown dispute resolution: ${resolution}`);
  }

  const config = DISPUTE_RESOLUTIONS[resolution];
  const actorName = opts.actorName || 'Admin';

  const orderPatch = {
    status: config.orderStatus,
    escrowStatus: config.escrowStatus,
    disputeResolution: resolutionKey,
    resolvedAt: opts.nowISO || new Date().toISOString(),
    resolvedById: opts.actorId || '',
    resolvedByName: actorName,
  };

  const systemMessage =
    resolutionKey === DISPUTE_RESOLUTIONS.release.key
      ? `Admin resolved the dispute in the seller's favour. Funds released to seller. A manual M-Pesa payout to the seller is pending admin confirmation.`
      : `Admin resolved the dispute in the buyer's favour. Order refunded. A manual M-Pesa reversal to the buyer is pending admin confirmation.`;

  const manualAction = manualActionFor(
    resolutionKey,
    order?.amount,
    opts.buyerPhone,
    opts.sellerPhone
  );

  return { resolutionKey, orderPatch, systemMessage, manualAction };
}
