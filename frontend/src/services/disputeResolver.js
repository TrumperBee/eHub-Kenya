export const DISPUTE_RESOLUTIONS = {
  release: {
    key: 'released_to_seller',
    label: 'Released to Seller',
    orderStatus: 'completed',
    escrowStatus: 'released',
  },
  refund: {
    key: 'refunded',
    label: 'Refunded to Buyer',
    orderStatus: 'refunded',
    escrowStatus: 'refunded',
  },
};

// Written by the pre-Phase-2 flow; kept so legacy resolved disputes still resolve.
export const LEGACY_DISPUTE_RESOLUTION_KEYS = ['refunded_to_buyer'];

export const DISPUTE_RESOLUTION_KEYS = new Set([
  ...Object.values(DISPUTE_RESOLUTIONS).map((r) => r.key),
  ...LEGACY_DISPUTE_RESOLUTION_KEYS,
]);

export function isResolvedDispute(order) {
  if (!order) return false;
  if (order.disputeStatus === 'resolved') return true;
  if (order.disputeResolution && DISPUTE_RESOLUTION_KEYS.has(order.disputeResolution)) return true;
  return false;
}

export function resolutionLabelFor(resolutionKey) {
  if (!resolutionKey) return '';
  const entry = Object.values(DISPUTE_RESOLUTIONS).find((r) => r.key === resolutionKey);
  return entry ? entry.label : 'Resolved';
}

export function formatKesLabel(amount) {
  const n = Number(amount) || 0;
  return `KES ${n.toLocaleString('en-US')}`;
}

function manualActionFor(resolutionKey, amount, buyerPhone, sellerPhone) {
  if (resolutionKey === DISPUTE_RESOLUTIONS.release.key) {
    return {
      type: 'release_payout',
      title: 'Manual payout to seller',
      detail: `Send ${formatKesLabel(amount)} to the seller${sellerPhone ? ` (${sellerPhone})` : ' (phone on record)'}. Confirm the transaction then mark the payout as sent.`,
    };
  }
  return {
    type: 'refund_reversal',
    title: 'Manual refund to buyer',
    detail: `Send back ${formatKesLabel(amount)} to the buyer${buyerPhone ? ` (${buyerPhone})` : ' (phone on record)'}. Confirm the reversal then mark the refund as sent.`,
  };
}

/**
 * Pure builder: given an order, a resolution ('release' | 'refund'), an optional
 * actor, and contact details, returns the Firestore patch to apply, the system
 * message to post to the order chat, and the manual payment action the admin
 * must perform to complete the resolution.
 *
 * The patch closes the first-class dispute state (disputeStatus: 'resolved')
 * and records the full audit trail:
 *   disputeRaisedAt / disputeRaisedBy  (written by the backend at raise time)
 *   disputeResolvedAt / disputeResolvedBy / disputeResolvedByName / disputeResolution
 */
export function buildDisputeResolution(order, resolution, opts = {}) {
  const resolutionKey = DISPUTE_RESOLUTIONS[resolution]?.key;
  if (!resolutionKey) {
    throw new Error(`Unknown dispute resolution: ${resolution}`);
  }

  const config = DISPUTE_RESOLUTIONS[resolution];
  const actorName = opts.actorName || 'Admin';
  const resolvedAt = opts.nowISO || new Date().toISOString();

  const orderPatch = {
    status: config.orderStatus,
    escrowStatus: config.escrowStatus,
    disputeStatus: 'resolved',
    disputeResolution: resolutionKey,
    disputeResolvedAt: resolvedAt,
    disputeResolvedBy: opts.actorId || '',
    disputeResolvedByName: actorName,
    disputeUpdatedAt: resolvedAt,
    adminReviewRequired: false,
    resolvedAt,
    resolvedById: opts.actorId || '',
    resolvedByName: actorName,
  };

  const systemMessage =
    resolutionKey === DISPUTE_RESOLUTIONS.release.key
      ? `Admin resolved the dispute in the seller's favour. Funds released to seller. A manual payout to the seller is pending admin confirmation.`
      : `Admin resolved the dispute in the buyer's favour. Order refunded. A manual refund to the buyer is pending admin confirmation.`;

  const manualAction = manualActionFor(
    resolutionKey,
    order?.amount,
    opts.buyerPhone,
    opts.sellerPhone
  );

  return { resolutionKey, orderPatch, systemMessage, manualAction };
}