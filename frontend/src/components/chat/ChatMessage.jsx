import { formatRelativeTime } from '../../utils/formatters';

export default function ChatMessage({ message, isOwnMessage }) {
  if (message.messageType === 'system' || message.senderRole === 'system') {
    return (
      <div className="flex justify-center py-2">
        <p className="text-xs text-[#5C5C5C] italic text-center max-w-[80%]">{message.content}</p>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
        isOwnMessage
          ? 'bg-[#BF0021] text-white rounded-br-md'
          : 'bg-[#242424] text-white rounded-bl-md border border-[#2A2A2A]'
      }`}>
        {!isOwnMessage && (
          <p className={`text-xs font-medium mb-0.5 ${isOwnMessage ? 'text-white/80' : 'text-[#9E9E9E]'}`}>
            {message.senderDisplayName || 'User'}
          </p>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-[10px] mt-1 text-right ${isOwnMessage ? 'text-white/60' : 'text-[#5C5C5C]'}`}>
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
