// eHub Kenya — seller overdue-credential sweep.
//
// Runs the 5-hour reminder and 24-hour escalation for paid orders that are
// still sitting in `awaiting_seller_delivery`. There is no Cloud Functions
// deployment in this project, so the sweep runs inside the same Node process as
// the API:
//
//   • once when the backend boots (server.js),
//   • every 60 minutes afterwards,
//   • on demand via POST /api/admin/run-overdue-check.
//
// IDEMPOTENCY: the order itself is the guard. The reminder writes
// `sellerOverdueReminderSentAt` and the escalation writes
// `sellerOverdueFlaggedAt` inside a Firestore transaction after re-checking the
// policy, so an overlapping pass, a Render restart or a manual admin run can
// never send the same reminder twice or increment the seller's warnings twice.
//
// All notification/email side effects happen AFTER the transaction commits.
// They are best-effort: a failed email or push never rolls back the flag.

const { adminDb, admin } = require('./firebaseAdmin');
const { sendPushToUser } = require('./pushService');
const {
  sendSellerOverdueReminderEmail,
  sendSellerOverdueFlaggedEmail,
  sendSellerSuspendedEmail,
} = require('./emailService');
const {
  MAX_WARNINGS,
  overdueStage,
  nextSellerState,
} = require('../utils/overduePolicy');
const logger = require('../utils/logger');

const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes
const SWEEP_QUERY_LIMIT = 300;

let sweepTimer = null;
let sweepRunning = false;

const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * In-app notification. The app's notification bell reads the top-level
 * `notifications` collection, while the per-user `users/{uid}/notifications`
 * feed is the documented per-account store. Both are written so the alert is
 * visible immediately and stays attached to the account.
 */
async function writeSellerNotification({ userId, title, message, orderId }) {
  if (!userId) return;
  const createdAt = serverTimestamp();
  const results = await Promise.allSettled([
    adminDb.collection('notifications').add({
      userId,
      title,
      message,
      type: 'order',
      orderId: orderId || null,
      read: false,
      createdAt,
    }),
    adminDb.collection('users').doc(userId).collection('notifications').add({
      title,
      message,
      type: 'order',
      orderId: orderId || null,
      read: false,
      createdAt,
    }),
  ]);
  results
    .filter((result) => result.status === 'rejected')
    .forEach((result) => logger.warn(`overdue notification write failed: ${result.reason?.message || result.reason}`));
}

/** Claim the one-and-only 5h reminder for an order. */
async function claimReminder(orderRef, nowMs) {
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return null;

    const order = { id: snap.id, ...snap.data() };
    if (overdueStage(order, nowMs) !== 'reminder') return null;

    let sellerSuspended = false;
    if (order.sellerId) {
      const userSnap = await tx.get(adminDb.collection('users').doc(order.sellerId));
      sellerSuspended = userSnap.exists && userSnap.data().suspended === true;
    }

    tx.update(orderRef, {
      sellerOverdueReminderSentAt: serverTimestamp(),
      sellerOverdueReminderHours: 5,
      updatedAt: serverTimestamp(),
    });

    return { order, sellerSuspended };
  });
}

/**
 * Claim the 24h escalation for an order and update the seller's warning count
 * in the same transaction. The order is re-read and re-decided inside the
 * transaction so a concurrent submit/refund/flag makes this a no-op.
 */
async function claimFlag(orderRef, nowMs) {
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return null;

    const order = { id: snap.id, ...snap.data() };
    if (overdueStage(order, nowMs) !== 'flag') return null;

    const userRef = order.sellerId ? adminDb.collection('users').doc(order.sellerId) : null;
    const userSnap = userRef ? await tx.get(userRef) : null;
    const userData = userSnap && userSnap.exists ? userSnap.data() : {};
    const wasSuspended = userData.suspended === true;
    const state = nextSellerState(userData, { maxWarnings: MAX_WARNINGS });

    tx.update(orderRef, {
      sellerOverdueFlaggedAt: serverTimestamp(),
      sellerOverdueHours: 24,
      sellerWarningCount: state.warningCount,
      sellerSuspended: state.suspended,
      updatedAt: serverTimestamp(),
    });

    if (userSnap && userSnap.exists) {
      const userUpdate = {
        // Absolute value (not increment) so concurrent runs converge instead of
        // drifting past the threshold.
        warnings: state.warningCount,
        suspended: state.suspended,
        updatedAt: serverTimestamp(),
      };
      if (state.newlySuspended) {
        userUpdate.suspendedAt = serverTimestamp();
        userUpdate.suspensionReason = 'repeated_failure_to_deliver';
      }
      tx.update(userRef, userUpdate);
    }

    return { order, ...state, wasSuspended };
  });
}

async function sendReminderSideEffects(order) {
  await Promise.allSettled([
    sendPushToUser(order.sellerId, {
      title: '⚠️ Reminder: credentials required',
      body: 'You have an order waiting for credential submission. Submit now to avoid account restrictions.',
      url: `/orders/${order.id}`,
    }),
    writeSellerNotification({
      userId: order.sellerId,
      title: '⚠️ Credentials Still Required',
      message: `Your order for "${order.listingTitle || 'your listing'}" was paid over 5 hours ago. Submit the account credentials now to avoid account restrictions.`,
      orderId: order.id,
    }),
    sendSellerOverdueReminderEmail(order),
  ]);
}

async function sendFlagSideEffects({ order, warningCount, suspended, newlySuspended, wasSuspended }) {
  // A seller who was already suspended has been told; don't spam them again.
  if (wasSuspended) return;

  const tasks = [
    sendPushToUser(order.sellerId, {
      title: '🚨 Your account has been flagged',
      body: 'Your account has been flagged for failing to deliver. Continued violations will result in a ban.',
      url: `/orders/${order.id}`,
    }),
    writeSellerNotification({
      userId: order.sellerId,
      title: '🚨 Account Flagged — Delivery Overdue',
      message: `Warning ${warningCount} of ${MAX_WARNINGS}: your account has been flagged for failing to deliver. Continued violations will result in a ban.`,
      orderId: order.id,
    }),
    sendSellerOverdueFlaggedEmail(order, { warningCount, maxWarnings: MAX_WARNINGS }),
  ];

  if (newlySuspended || suspended) {
    tasks.push(
      writeSellerNotification({
        userId: order.sellerId,
        title: 'Seller Account Suspended',
        message:
          'Your eHub Market seller account has been suspended due to repeated failure to deliver. You cannot create new listings.',
        orderId: order.id,
      }),
      sendSellerSuspendedEmail(order)
    );
  }

  await Promise.allSettled(tasks);
}

/**
 * One full pass over open orders. Safe to call concurrently: the per-order
 * transactions decide whether each action still applies.
 *
 * @returns {Promise<{scanned:number,reminders:number,flagged:number,suspended:number,skipped:number,failed:number}>}
 */
async function runOverdueSellerCheck({ nowMs = Date.now(), limit = SWEEP_QUERY_LIMIT } = {}) {
  const results = {
    scanned: 0,
    reminders: 0,
    flagged: 0,
    suspended: 0,
    skipped: 0,
    failed: 0,
  };

  const snap = await adminDb
    .collection('orders')
    .where('status', '==', 'awaiting_seller_delivery')
    .limit(limit)
    .get();

  results.scanned = snap.size;

  for (const doc of snap.docs) {
    const order = { id: doc.id, ...doc.data() };
    const stage = overdueStage(order, nowMs);

    if (stage === 'none') {
      results.skipped += 1;
      continue;
    }

    try {
      if (stage === 'reminder') {
        const claimed = await claimReminder(doc.ref, nowMs);
        if (!claimed) {
          results.skipped += 1;
          continue;
        }
        results.reminders += 1;
        if (!claimed.sellerSuspended) {
          await sendReminderSideEffects(claimed.order);
        }
        continue;
      }

      const claimed = await claimFlag(doc.ref, nowMs);
      if (!claimed) {
        results.skipped += 1;
        continue;
      }
      results.flagged += 1;
      if (claimed.suspended) results.suspended += 1;
      await sendFlagSideEffects(claimed);
    } catch (err) {
      results.failed += 1;
      logger.error(`overdue sweep failed for order ${doc.id}: ${err.message}`);
    }
  }

  return results;
}

/**
 * Boot-time run plus a 60-minute interval. `unref()` keeps the timer from
 * holding the process open during shutdown/tests.
 */
function startOverdueSellerScheduler() {
  if (sweepTimer) return sweepTimer;

  const tick = async () => {
    if (sweepRunning) {
      logger.warn('overdue seller sweep skipped — previous pass still running');
      return;
    }
    sweepRunning = true;
    try {
      const result = await runOverdueSellerCheck();
      logger.info(
        `overdue seller sweep: scanned ${result.scanned}, reminders ${result.reminders}, ` +
        `flagged ${result.flagged}, suspended ${result.suspended}, failed ${result.failed}`
      );
    } catch (err) {
      logger.error(`overdue seller sweep crashed: ${err.message}`);
    } finally {
      sweepRunning = false;
    }
  };

  // Run once at boot so a Render restart never delays overdue alerts.
  tick();
  sweepTimer = setInterval(tick, SWEEP_INTERVAL_MS);
  if (typeof sweepTimer.unref === 'function') sweepTimer.unref();
  return sweepTimer;
}

function stopOverdueSellerScheduler() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

module.exports = {
  SWEEP_INTERVAL_MS,
  runOverdueSellerCheck,
  startOverdueSellerScheduler,
  stopOverdueSellerScheduler,
};
