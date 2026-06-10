import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const STATS_REF = doc(db, 'stats', 'global');

export const seedStatsIfMissing = async () => {
  const snap = await getDoc(STATS_REF);
  if (!snap.exists()) {
    await setDoc(STATS_REF, {
      totalAccountsListed: 0,
      totalSalesCompleted: 8,
      registeredSellers: 0,
      transactionsProcessed: 8,
    });
  }
};

export const subscribeToStats = (callback) => {
  return onSnapshot(STATS_REF, (snap) => {
    if (snap.exists()) callback(snap.data());
  });
};

export const incrementListingCount = () =>
  updateDoc(STATS_REF, { totalAccountsListed: increment(1) });

export const decrementListingCount = () =>
  updateDoc(STATS_REF, { totalAccountsListed: increment(-1) });

export const incrementSellerCount = () =>
  updateDoc(STATS_REF, { registeredSellers: increment(1) });

export const decrementSellerCount = () =>
  updateDoc(STATS_REF, { registeredSellers: increment(-1) });
