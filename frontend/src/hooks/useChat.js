import { useState, useEffect } from 'react';
import { subscribeToMessages, sendMessage as sendMsg } from '../services/chatService';
import { useAuth } from '../context/AuthContext';

export function useChat(orderId) {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    const unsub = subscribeToMessages(orderId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    return unsub;
  }, [orderId]);

  const sendMessage = async (content) => {
    if (!currentUser || !orderId || !content.trim()) return;
    const displayName = userProfile?.displayName || currentUser.displayName || 'User';
    const role = userProfile?.sellerApproved === true && orderId ? 'seller' : 'buyer';
    await sendMsg(orderId, currentUser.uid, displayName, role, content.trim());
  };

  return { messages, loading, sendMessage };
}
