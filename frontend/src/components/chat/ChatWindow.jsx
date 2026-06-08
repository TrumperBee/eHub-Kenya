import { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { ORDER_STATUS } from '../../utils/constants';

function getStatusMessage(status) {
  switch (status) {
    case 'payment_confirmed':
      return 'Payment received. Seller: share your buyer\'s email. Buyer: share your email in chat.';
    case 'in_transfer':
      return 'Transfer in progress. Buyer: wait for seller to change the email, then confirm.';
    case 'completed':
      return 'This order is complete. Thank you!';
    case 'disputed':
      return 'Dispute raised. Admin will review and resolve.';
    default:
      return '';
  }
}

export default function ChatWindow({ orderId, order, currentUserId }) {
  const { messages, loading, sendMessage } = useChat(orderId);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const statusConfig = ORDER_STATUS[order?.status];
  const isDisabled = order?.status === 'completed' || order?.status === 'disputed' || order?.status === 'cancelled';
  const statusMsg = order ? getStatusMessage(order.status) : '';

  return (
    <div className="flex flex-col h-full bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
      <div className="p-4 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2 mb-2">
          {statusConfig && (
            <span className={`text-xs font-semibold ${statusConfig.color || 'text-[#9E9E9E]'}`}>
              {statusConfig.label}
            </span>
          )}
        </div>
        {statusMsg && (
          <p className="text-xs text-[#5C5C5C] leading-relaxed">{statusMsg}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-[300px] max-h-[500px]">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-[#5C5C5C] py-8">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isOwnMessage={msg.senderId === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={isDisabled} />
    </div>
  );
}
