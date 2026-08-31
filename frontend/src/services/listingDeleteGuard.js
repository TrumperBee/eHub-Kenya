export const TERMINAL_ORDER_STATUSES = ['completed', 'cancelled', 'refunded'];

export const isOngoingOrderStatus = (status) => !TERMINAL_ORDER_STATUSES.includes(status);

export const countOngoingOrders = (orderStatuses) =>
  (Array.isArray(orderStatuses) ? orderStatuses : []).filter(isOngoingOrderStatus).length;
