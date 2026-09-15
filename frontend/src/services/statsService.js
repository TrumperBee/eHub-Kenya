import { onSnapshot, doc, increment, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

// Public platform counters. The backend derives ALL values from source-of-truth
// data (listings/orders/users) via the reconciliation service and writes them
// with the Admin SDK. The only client-side mutation is the idempotent one-time
// totalUsers increment performed when a brand-new user finishes registering.
const STATS_REF = doc(db, 'stats', 'global');

export const subscribeToStats = (callback) => {
  return onSnapshot(STATS_REF, (snap) => {
    const data = snap.exists() ? snap.data() : {};
    callback({
      totalAccountsListed: data.totalAccountsListed || 0,
      totalSalesCompleted: data.totalSalesCompleted || 0,
      registeredSellers: data.registeredSellers || 0,
      transactionsProcessed: data.transactionsProcessed || 0,
      totalUsers: data.totalUsers || 0,
    });
  }, (err) => console.warn('Stats subscription error:', err.code));
};

/**
 * Records a brand-new registered user in the shared stats/global doc.
 *
 * Idempotent: the user's own Firestore doc (keyed by their stable Firebase UID)
 * carries a statsCounted flag, and the whole check + flag + atomic increment
 * runs inside one Firestore transaction. Double signup callbacks, auth
 * listeners, retries and refreshes can never count the same user twice, and two
 * concurrent signups by different users each increment exactly once.
 */
export const registerNewUserCount = async (uid) => {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (snap.exists() && snap.data().statsCounted === true) return;
    tx.update(userRef, { statsCounted: true });
    tx.set(STATS_REF, { totalUsers: increment(1) }, { merge: true });
  });
};