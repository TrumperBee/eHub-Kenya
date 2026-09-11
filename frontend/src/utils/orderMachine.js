export const PAID_AND_PENDING_STATUSES = [
  'payment_confirmed',
  'in_transfer',
  'awaiting_seller_delivery',
  'credentials_submitted',
];

export const LEGACY_PAID_STATUSES = ['payment_confirmed', 'in_transfer'];

export const TERMINAL_STATUSES = ['completed', 'disputed', 'refunded', 'cancelled'];

export const isPaidStatus = (status) => PAID_AND_PENDING_STATUSES.includes(status);

export const isTerminalStatus = (status) => TERMINAL_STATUSES.includes(status);

// Seller can submit account credentials while the order is paid but not yet delivered.
export const sellerCanDeliver = (status) =>
  ['payment_confirmed', 'in_transfer', 'awaiting_seller_delivery'].includes(status);

// Buyer can confirm delivery once credentials are submitted (or on legacy paid states).
export const buyerCanConfirm = (status) =>
  ['credentials_submitted', 'payment_confirmed', 'in_transfer'].includes(status);

// Buyer can raise a dispute once paid and while the order is still in flight.
export const buyerCanDispute = (status) => isPaidStatus(status) && !TERMINAL_STATUSES.includes(status);