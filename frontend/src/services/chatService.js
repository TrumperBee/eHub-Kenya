import { db } from './firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export const getOrderMessagesRef = (orderId) => {
  return collection(db, 'orders', orderId, 'messages');
};

export const sendMessage = async (orderId, senderId, senderDisplayName, senderRole, content, messageType = 'text') => {
  const ref = getOrderMessagesRef(orderId);
  return addDoc(ref, {
    senderId,
    senderDisplayName,
    senderRole,
    content,
    messageType,
    createdAt: serverTimestamp(),
  });
};

export const sendSystemMessage = async (orderId, content) => {
  const ref = getOrderMessagesRef(orderId);
  return addDoc(ref, {
    senderId: 'system',
    senderDisplayName: 'System',
    senderRole: 'system',
    content,
    messageType: 'system',
    createdAt: serverTimestamp(),
  });
};

export const subscribeToMessages = (orderId, callback) => {
  const q = query(getOrderMessagesRef(orderId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
};
