import { db } from './firebase';
import { collection, query, where, orderBy, getDocs, getDoc, doc, addDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const ordersRef = collection(db, 'orders');

export const createOrder = async (data) => {
  return addDoc(ordersRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
};

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

export const updateOrder = async (id, data) => {
  return updateDoc(doc(db, 'orders', id), { ...data, updatedAt: serverTimestamp() });
};

export const getAllOrders = async () => {
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToOrder = (orderId, callback) => {
  return onSnapshot(doc(db, 'orders', orderId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  });
};
