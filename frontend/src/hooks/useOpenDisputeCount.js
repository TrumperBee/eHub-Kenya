import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL } from '../utils/constants';

/**
 * Live count of UNRESOLVED disputes for the admin sidebar badge.
 * Equality-only query (no composite index needed); updates instantly
 * when a new dispute lands in Firestore.
 */
export default function useOpenDisputeCount() {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setIsAdmin(!!currentUser && currentUser.email === ADMIN_EMAIL);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;
    const q = query(collection(db, 'orders'), where('status', '==', 'disputed'));
    const unsub = onSnapshot(
      q,
      (snap) => setCount(snap.docs.length),
      (err) => console.warn('Dispute counter subscription error:', err.code)
    );
    return unsub;
  }, [currentUser]);

  return { count, isAdmin };
}