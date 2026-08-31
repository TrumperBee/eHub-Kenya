import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

const STATS_REF = doc(db, 'stats', 'global');

const ordersRef = collection(db, 'orders');
const transactionsRef = collection(db, 'transactions');
const listingsRef = collection(db, 'listings');
const usersRef = collection(db, 'users');

export const seedStatsIfMissing = async () => {
  // Retained only for call-site compatibility. Live counts are computed from the
  // source collections and there are no placeholder values to seed.
  return Promise.resolve();
};

export const subscribeToStats = (callback) => {
  const completedOrdersQ = query(ordersRef, where('status', '==', 'completed'));
  const successTxQ = query(transactionsRef, where('status', '==', 'success'));
  const activeListingsQ = query(listingsRef, where('status', '==', 'active'));
  const approvedSellersQ = query(
    usersRef,
    where('role', '==', 'seller'),
    where('sellerApproved', '==', true)
  );

  const compute = () => callback({
    totalSalesCompleted: completedOrdersCount,
    transactionsProcessed: successTxCount,
    totalAccountsListed: activeListingsCount,
    registeredSellers: approvedSellersCount,
  });

  let completedOrdersCount = 0;
  let successTxCount = 0;
  let activeListingsCount = 0;
  let approvedSellersCount = 0;

  const watches = [
    onSnapshot(completedOrdersQ, (snap) => {
      completedOrdersCount = snap.size;
      compute();
    }, (err) => console.warn('Stats subscription error:', err.code)),
    onSnapshot(successTxQ, (snap) => {
      successTxCount = snap.size;
      compute();
    }, (err) => console.warn('Stats subscription error:', err.code)),
    onSnapshot(activeListingsQ, (snap) => {
      activeListingsCount = snap.size;
      compute();
    }, (err) => console.warn('Stats subscription error:', err.code)),
    onSnapshot(approvedSellersQ, (snap) => {
      approvedSellersCount = snap.size;
      compute();
    }, (err) => console.warn('Stats subscription error:', err.code)),
  ];

  return () => watches.forEach((unsub) => unsub());
};

export const incrementListingCount = () =>
  updateDoc(STATS_REF, { totalAccountsListed: increment(1) });

export const decrementListingCount = () =>
  updateDoc(STATS_REF, { totalAccountsListed: increment(-1) });

export const incrementSellerCount = () =>
  updateDoc(STATS_REF, { registeredSellers: increment(1) });

export const decrementSellerCount = () =>
  updateDoc(STATS_REF, { registeredSellers: increment(-1) });
