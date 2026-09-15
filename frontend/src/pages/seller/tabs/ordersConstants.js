// Single source of truth for the seller Orders tab: status filters, actionable
// statuses and the seller-facing status labels (requirement: NEW PAID ORDER →
// ACCOUNT DETAILS REQUIRED, ACCOUNT DETAILS SUBMITTED → WAITING FOR BUYER,
// COMPLETED → SALE COMPLETE, DISPUTED → PAYMENT ON HOLD — ADMIN REVIEW,
// REFUNDED → ORDER REFUNDED). Buyers and admin keep their own labels.

export const ACTIONS_REQUIRED_STATUSES = ['awaiting_seller_delivery', 'payment_confirmed'];

export const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Action Required' },
  { id: 'submitted', label: 'Waiting for Buyer' },
  { id: 'completed', label: 'Completed' },
  { id: 'disputed', label: 'Payment on Hold' },
];

export const FILTER_MATCH = {
  all: () => true,
  pending: (s) => ACTIONS_REQUIRED_STATUSES.includes(s),
  submitted: (s) => ['credentials_submitted', 'in_transfer'].includes(s),
  completed: (s) => s === 'completed',
  disputed: (s) => s === 'disputed',
};

export const SELLER_STATUS = {
  pending_payment:           { label: 'AWAITING PAYMENT',    color: '#B45309', bg: '#FEF3C7' },
  payment_confirmed:         { label: 'NEW PAID ORDER',      color: '#C8102E', bg: '#FEF2F2' },
  awaiting_seller_delivery:  { label: 'NEW PAID ORDER',      color: '#C8102E', bg: '#FEF2F2' },
  in_transfer:               { label: 'WAITING FOR BUYER',   color: '#1D4ED8', bg: '#EFF6FF' },
  credentials_submitted:     { label: 'WAITING FOR BUYER',   color: '#1D4ED8', bg: '#EFF6FF' },
  completed:                 { label: 'SALE COMPLETE',       color: '#15803D', bg: '#F0FDF4' },
  disputed:                  { label: 'PAYMENT ON HOLD',     color: '#C8102E', bg: '#FEF2F2' },
  refunded:                  { label: 'ORDER REFUNDED',      color: '#6B7280', bg: '#F3F4F6' },
  cancelled:                 { label: 'CANCELLED',           color: '#6B7280', bg: '#F3F4F6' },
};