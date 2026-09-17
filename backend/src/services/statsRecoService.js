const { adminDb } = require('./firebaseAdmin');
const { runMaturedReleasePass } = require('./escrowAutoRelease');

// Source-of-truth definitions for the public homepage stats (documented in
// backend/firestore.rules). Every metric is DERIVED from the actual data:
//
//   totalAccountsListed   = listings currently purchasable (status == 'active').
//                           Excludes reserved (locked in an order), sold, paused
//                           (deactivated) and removed listings.
//   totalSalesCompleted   = orders whose escrow was actually released
//                           (status == 'completed').
//   transactionsProcessed = orders that received a Paystack-verified payment
//                           (paymentStatus == 'paid'). Includes orders that were
//                           later refunded or disputed, so it is distinct from
//                           totalSalesCompleted — it counts payments, not sales.
//   registeredSellers     = approved sellers (role == 'seller' && sellerApproved).
//   totalUsers            = registered user accounts (docs in /users) excluding
//                           soft-deleted accounts (deleted == true).

const STATS_DOC_ID = 'stats/global';

function now() {
  return new Date();
}

async function readStatsDoc() {
  const snap = await adminDb.doc(STATS_DOC_ID).get();
  return snap.exists ? snap.data() : {};
}

async function countAvailableListings() {
  const snap = await adminDb.collection('listings')
    .where('status', '==', 'active')
    .count()
    .get();
  return snap.data().count;
}

async function countCompletedSales() {
  const snap = await adminDb.collection('orders')
    .where('status', '==', 'completed')
    .count()
    .get();
  return snap.data().count;
}

async function countProcessedTransactions() {
  const snap = await adminDb.collection('orders')
    .where('paymentStatus', '==', 'paid')
    .count()
    .get();
  return snap.data().count;
}

async function countRegisteredUsers() {
  const [totalSnap, deletedSnap] = await Promise.all([
    adminDb.collection('users').count().get(),
    adminDb.collection('users').where('deleted', '==', true).count().get(),
  ]);
  return totalSnap.data().count - deletedSnap.data().count;
}

async function countApprovedSellers() {
  const snap = await adminDb.collection('users')
    .where('role', '==', 'seller')
    .where('sellerApproved', '==', true)
    .count()
    .get();
  return snap.data().count;
}

let isRunning = false;
let rerunQueued = false;

/**
 * Recomputes all five platform stats from source-of-truth data and writes only
 * the fields that actually changed (so homepage subscribers don't get spammed
 * with identical snapshots). Idempotent and safe to call concurrently — each
 * run computes the same truth and writes it.
 */
async function reconcilePlatformStats() {
  const [totalAccountsListed, totalSalesCompleted, transactionsProcessed, totalUsers, registeredSellers] = await Promise.all([
    countAvailableListings(),
    countCompletedSales(),
    countProcessedTransactions(),
    countRegisteredUsers(),
    countApprovedSellers(),
  ]);

  const stats = {
    totalAccountsListed,
    totalSalesCompleted,
    transactionsProcessed,
    totalUsers,
    registeredSellers,
  };

  const current = await readStatsDoc();
  const patch = {};
  for (const key of Object.keys(stats)) {
    if (current[key] === undefined || current[key] !== stats[key]) {
      patch[key] = stats[key];
    }
  }

  if (Object.keys(patch).length > 0) {
    await adminDb.doc(STATS_DOC_ID).set(patch, { merge: true });
    console.log(`[stats] reconciled ${Object.keys(patch).join(', ')}`);
  }

  return stats;
}

async function runReconcile() {
  try {
    await reconcilePlatformStats();
    // Phase-5: same in-process worker also auto-releases matured (expired,
    // undisputed, escrow-held) orders. Idempotent + dispute-frozen internally.
    await runMaturedReleasePass({ limit: 100 }).catch(() => {});
  } catch (err) {
    console.error(`[stats] reconciliation error at ${now().toISOString()}:`, err.message);
  } finally {
    isRunning = false;
    if (rerunQueued) {
      rerunQueued = false;
      runReconcile();
    }
  }
}

/** Fire-and-forget reconcile — used after trusted backend transitions. */
function reconcileAsync() {
  if (isRunning) {
    rerunQueued = true;
    return Promise.resolve(null);
  }
  isRunning = true;
  return runReconcile();
}

/** Starts the background reconciler. Call once after the server boots. */
function startStatsReconciler() {
  const intervalMs = Math.max(30_000, Number(process.env.STATS_RECONCILE_INTERVAL_MS) || 120_000);
  reconcileAsync();
  setInterval(() => reconcileAsync(), intervalMs);
  console.log(`[stats] background reconciler started (every ${Math.round(intervalMs / 1000)}s)`);
}

module.exports = { reconcilePlatformStats, reconcileAsync, startStatsReconciler };