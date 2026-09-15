import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ACTIONS_REQUIRED_STATUSES } from '../pages/seller/tabs/ordersConstants';

// Real-time count of orders where the seller still has to act:
// the buyer paid and is waiting for the seller to submit account details.
// Reuses the existing sellerId + createdAt query so no new composite index is needed.
export default function useSellerActionOrders(uid) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) return undefined;

    const q = query(collection(db, 'orders'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        let n = 0;
        snap.forEach((d) => {
          if (ACTIONS_REQUIRED_STATUSES.includes(d.data().status)) n += 1;
        });
        setCount(n);
      },
      (err) => {
        console.warn('Seller orders subscription error:', err?.code);
      }
    );

    return unsub;
  }, [uid]);

  return count;
}