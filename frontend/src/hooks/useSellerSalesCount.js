import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { normalizeSalesCount } from '../utils/sellerTier';

// Listing documents only carry seller identity, so cards read the authoritative
// completedSalesCount from the public user document. A missing field resolves to
// zero, which keeps legacy sellers at NEW SELLER without a migration.
export function useSellerSalesCount(sellerId, initialCount) {
  const fallback = normalizeSalesCount(initialCount);
  const key = `${sellerId || ''}:${fallback}`;
  const [resolved, setResolved] = useState({ key, count: fallback });

  useEffect(() => {
    let active = true;
    if (!sellerId) return () => { active = false; };

    getDoc(doc(db, 'users', sellerId))
      .then((snap) => {
        if (active) {
          setResolved({
            key,
            count: snap.exists() ? normalizeSalesCount(snap.data()?.completedSalesCount) : fallback,
          });
        }
      })
      .catch(() => { /* seller profile may be unavailable; keep the fallback */ });

    return () => { active = false; };
  }, [sellerId, key, fallback]);

  return resolved.key === key ? resolved.count : fallback;
}
