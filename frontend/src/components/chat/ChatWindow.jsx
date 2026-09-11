import { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { ORDER_STATUS } from '../../utils/constants';

function getStatusMessage(status) {
  switch (status) {
    case 'payment_confirmed':
    case 'awaiting_seller_delivery':
      return 'Payment received. Seller: submit the eFootball account login details from the order page. Buyer: the seller will submit them here shortly.';
    case 'credentials_submitted':
    case 'in_transfer':
      return 'Account details submitted. Buyer: verify the login, change the password, then confirm delivery.';
    case 'completed':
      return 'This order is complete. Thank you!';
    case 'disputed':
      return 'Dispute raised. Escrow frozen. Admin will review the case and resolve it. Seller: your payout is on hold. Buyer: your payment is protected while the case is reviewed.';
    case 'pending_payment':
      return 'Payment pending. This order opens once payment is confirmed.';
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
  const isDisabled = order?.status === 'completed' || order?.status === 'disputed' || order?.status === 'cancelled' || order?.status === 'refunded';
  const statusMsg = order ? getStatusMessage(order.status) : '';

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-konami-mid-gray overflow-hidden shadow-card">
      <div className="p-4 border-b border-konami-mid-gray bg-konami-blue">
        <div className="flex items-center gap-2 mb-2">
          {statusConfig && (
            <span className={`text-xs font-semibold text-white`}>
              {statusConfig.label}
            </span>
          )}
        </div>
        {statusMsg && (
          <p className="text-xs text-white/70 leading-relaxed">{statusMsg}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-[300px] max-h-[500px] bg-konami-light-gray">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-konami-text-muted py-8">No messages yet. Start the conversation.</p>
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
