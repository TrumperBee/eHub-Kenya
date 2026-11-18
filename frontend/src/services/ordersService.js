import { db } from './firebase';
import { collection, query, where, orderBy, getDocs, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { resolveOrderPlatform } from '../utils/orderPlatform';

const ordersRef = collection(db, 'orders');

export { resolveOrderPlatform };

// SECURITY: there is deliberately no client-side createOrder/updateOrder.
// Orders are created by POST /api/payment/stk-push and mutated by the escrow
// endpoints (Admin SDK); firestore.rules rejects every client write.

export const getOrderById = async (id) => {
  const snap = await getDoc(doc(db, 'orders', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getBuyerOrders = async (buyerId) => {
  const q = query(ordersRef, where('buyerId', '==', buyerId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getSellerOrders = async (sellerId) => {
  const q = query(ordersRef, where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllOrders = async () => {
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToOrder = (orderId, callback, onError) => {
  return onSnapshot(
    doc(db, 'orders', orderId),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    },
    (err) => {
      if (onError) onError(err);
    }
  );
};

export const getOrderDeliveries = async (orderId) => {
  const q = query(collection(db, 'orders', orderId, 'delivery'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const subscribeToDeliveries = (orderId, callback) => {
  const q = query(collection(db, 'orders', orderId, 'delivery'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};
