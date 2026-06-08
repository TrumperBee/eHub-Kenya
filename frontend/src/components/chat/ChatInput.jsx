import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 80) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-konami-mid-gray bg-white rounded-b-2xl">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Chat is disabled' : 'Type a message...'}
        rows={1}
        disabled={disabled}
        className="flex-1 bg-konami-light-gray text-konami-text text-sm rounded-xl px-4 py-2.5 outline-none border border-konami-mid-gray focus:border-konami-blue transition-colors resize-none placeholder-konami-text-muted disabled:opacity-40"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="w-10 h-10 rounded-xl bg-konami-blue flex items-center justify-center shrink-0 hover:bg-konami-blue-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Send size={16} className="text-white" />
      </button>
    </div>
  );
}
