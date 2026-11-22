// Pure helpers behind the admin analytics dashboard.
//
// Everything here takes plain arrays (orders/users already stripped of the
// Firestore wrapper) and returns chart-ready data. Keeping the maths out of the
// components makes the numbers testable and keeps the dashboard render simple.

import { canonicalStatus, ORDER_STATUS } from './orderMachine.js';
import { completedAtMs, platformFee } from './payouts.js';

export const ANALYTICS_DAYS = 30;

// Display order for the status chart. `payment_failed` is a legacy/non-canonical
// value that can still appear on old order documents; unknown values found in
// the data are appended after these.
export const STATUS_ORDER = [
  'pending_payment',
  'awaiting_seller_delivery',
  'credentials_submitted',
  'completed',
  'disputed',
  'payment_failed',
  'refunded',
  'cancelled',
];

export const STATUS_COLORS = {
  pending_payment: '#F59E0B',
  awaiting_seller_delivery: '#FBBF24',
  credentials_submitted: '#8B5CF6',
  completed: '#16A34A',
  disputed: '#C8102E',
  payment_failed: '#6B7280',
  refunded: '#9CA3AF',
  cancelled: '#4B5563',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Firestore Timestamp, {seconds}, Date, ISO string or epoch millis -> millis. */
export function timestampMs(value) {
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }
  if (value instanceof Date) return value.getTime();
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Local YYYY-MM-DD key; local (not UTC) so "today" matches the admin's clock. */
export const dayKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

const dayLabel = (date) => `${date.getDate()} ${MONTHS[date.getMonth()]}`;

/** Fixed-length, zero-filled day buckets ending today (inclusive). */
export function buildLastNDays(days = ANALYTICS_DAYS, now = new Date()) {
  const end = startOfDay(now);
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    buckets.push({ key: dayKey(d), label: dayLabel(d) });
  }
  return buckets;
}

/** KES from completed orders, bucketed per day. */
export function buildRevenueSeries(orders = [], { days = ANALYTICS_DAYS, now = new Date() } = {}) {
  const buckets = buildLastNDays(days, now);
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  orders.forEach((order) => {
    if (canonicalStatus(order?.status) !== 'completed') return;
    const ms = completedAtMs(order);
    if (!ms) return;
    const bucket = byKey.get(dayKey(new Date(ms)));
    if (!bucket) return;
    bucket.value = (bucket.value || 0) + (Number(order.amount) || 0);
  });

  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: bucket.value || 0,
  }));
}

/** User documents registered per day, using their `createdAt` field. */
export function buildRegistrationSeries(users = [], { days = ANALYTICS_DAYS, now = new Date() } = {}) {
  const buckets = buildLastNDays(days, now);
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  users.forEach((user) => {
    const ms = timestampMs(user?.createdAt);
    if (!ms) return;
    const bucket = byKey.get(dayKey(new Date(ms)));
    if (!bucket) return;
    bucket.value = (bucket.value || 0) + 1;
  });

  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: bucket.value || 0,
  }));
}

const statusLabel = (status) => {
  if (ORDER_STATUS[status]?.label) return ORDER_STATUS[status].label;
  if (status === 'payment_failed') return 'Payment Failed';
  if (status === 'unknown' || !status) return 'Unknown';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/** Every status in the canonical list (even at zero) plus any unknown values. */
export function buildStatusBreakdown(orders = []) {
  const counts = new Map(STATUS_ORDER.map((status) => [status, 0]));

  orders.forEach((order) => {
    const status = canonicalStatus(order?.status) || 'unknown';
    counts.set(status, (counts.get(status) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([status, count]) => ({
    status,
    label: statusLabel(status),
    count,
  }));
}

/** Top sellers by number of completed orders (revenue breaks ties). */
export function buildTopSellers(orders = [], limit = 5) {
  const sellers = new Map();

  orders.forEach((order) => {
    if (canonicalStatus(order?.status) !== 'completed') return;
    const sellerId = order?.sellerId;
    if (!sellerId) return;

    const entry = sellers.get(sellerId) || {
      sellerId,
      name: '',
      orders: 0,
      revenue: 0,
    };
    entry.orders += 1;
    entry.revenue += Number(order.amount) || 0;
    const name = order.sellerDisplayName || order.sellerUsername;
    if (name) entry.name = name;
    sellers.set(sellerId, entry);
  });

  return Array.from(sellers.values())
    .map((entry) => ({
      ...entry,
      name: entry.name || `Seller ${entry.sellerId.slice(0, 6)}`,
    }))
    .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue)
    .slice(0, limit);
}

/** Total platform fees on completed orders, using the shared fee rate. */
export function totalPlatformFees(orders = []) {
  return orders.reduce((sum, order) => {
    if (canonicalStatus(order?.status) !== 'completed') return sum;
    return sum + platformFee(order.amount);
  }, 0);
}

export function totalCompletedValue(orders = []) {
  return orders.reduce((sum, order) => {
    if (canonicalStatus(order?.status) !== 'completed') return sum;
    return sum + (Number(order.amount) || 0);
  }, 0);
}

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * CSV of every completed order: date, orderId, buyerId, sellerId, amount,
 * platformFee, status. Newest first, platformFee from the shared payout util.
 */
export function buildCompletedOrdersCsv(orders = []) {
  const header = ['date', 'orderId', 'buyerId', 'sellerId', 'amount', 'platformFee', 'status'];

  const rows = orders
    .filter((order) => canonicalStatus(order?.status) === 'completed')
    .sort((a, b) => completedAtMs(b) - completedAtMs(a))
    .map((order) => {
      const ms = completedAtMs(order);
      return [
        ms ? new Date(ms).toISOString() : '',
        order.id || '',
        order.buyerId || '',
        order.sellerId || '',
        Number(order.amount) || 0,
        platformFee(order.amount),
        'completed',
      ];
    });

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
