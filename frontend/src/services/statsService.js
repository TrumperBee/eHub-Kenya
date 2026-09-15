import { onSnapshot, doc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

// Public platform counters. Written by the backend (sales/transactions) and by
// listing/seller flows (accounts/sellers). Firestore rules allow public reads of
// this doc, unlike the restricted orders/transactions collections.
const STATS_REF = doc(db, 'stats', 'global');

export const seedStatsIfMissing = async () => {
  // Retained only for call-site compatibility. Counts come live from stats/global.
  return Promise.resolve();
};

export const subscribeToStats = (callback) => {
  return onSnapshot(STATS_REF, (snap) => {
    const data = snap.exists() ? snap.data() : {};
    callback({
      totalSalesCompleted: data.totalSalesCompleted || 0,
      transactionsProcessed: data.transactionsProcessed || 0,
      totalAccountsListed: data.totalAccountsListed || 0,
      registeredSellers: data.registeredSellers || 0,
    });
  }, (err) => console.warn('Stats subscription error:', err.code));
};

export const incrementListingCount = () =>
  setDoc(STATS_REF, { totalAccountsListed: increment(1) }, { merge: true });

export const decrementListingCount = () =>
  setDoc(STATS_REF, { totalAccountsListed: increment(-1) }, { merge: true });

export const incrementSellerCount = () =>
  setDoc(STATS_REF, { registeredSellers: increment(1) }, { merge: true });

export const decrementSellerCount = () =>
  setDoc(STATS_REF, { registeredSellers: increment(-1) }, { merge: true });
