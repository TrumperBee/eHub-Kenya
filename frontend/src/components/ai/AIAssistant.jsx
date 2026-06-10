import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X as XIcon, ChevronDown, ArrowRight, Bot } from 'lucide-react';
import { sendMessageToAI } from '../../services/aiService';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hey! I'm EHub AI \uD83D\uDC4B I'm here to help you navigate eFootball Hub Kenya. Ask me anything \u2014 how to buy, how to sell, pricing advice, or anything about eFootball!",
};

const QUICK_SUGGESTIONS = [
  'How do I buy an account?',
  'How does M-Pesa payment work?',
  'What do the tiers mean?',
  'How do I become a seller?',
  'Is buying here safe?',
];

export default function AIAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [showSuggestions, setShowSuggestions] = useState(true);

  const dragOffset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const hideOnPaths = ['/login', '/register', '/setup-username'];
  const isAdminPath = location.pathname.startsWith('/hub-command-af29x');
  if (hideOnPaths.includes(location.pathname) || isAdminPath) return null;

  useEffect(() => {
    const saved = localStorage.getItem('ehub_ai_position');
    if (saved) {
      try { setPosition(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ehub_ai_position', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setHasOpenedChat(true);
      setHasUnread(false);
    } else {
      setIsOpen(false);
    }
  };

  const handleMouseDown = (e) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 56, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragOffset.current.y));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = (e) => {
    const dx = Math.abs(e.clientX - mouseDownPos.current.x);
    const dy = Math.abs(e.clientY - mouseDownPos.current.y);
    if (dx > 5 || dy > 5) didDrag.current = true;
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragOffset.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = Math.max(0, Math.min(window.innerWidth - 56, touch.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, touch.clientY - dragOffset.current.y));
    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleButtonClick = () => {
    if (!didDrag.current) toggleChat();
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    const userMessage = { role: 'user', content: userText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const apiMessages = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await sendMessageToAI(apiMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (!isOpen) setHasUnread(true);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Try again in a moment.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const chatPanelStyle = () => {
    const panelW = Math.min(360, window.innerWidth - 32);
    const panelH = Math.min(520, window.innerHeight * 0.6);
    const gap = 12;
    let left = position.x + 28 - panelW / 2;
    left = Math.max(16, Math.min(window.innerWidth - panelW - 16, left));
    let top;
    if (position.y > window.innerHeight / 2) {
      top = position.y - panelH - gap;
      if (top < 68) top = 68;
    } else {
      top = position.y + 56 + gap;
      if (top + panelH > window.innerHeight - 16) {
        top = window.innerHeight - panelH - 16;
      }
    }
    return { left, top, width: panelW, height: panelH };
  };

  const panelPos = isOpen ? chatPanelStyle() : {};

  return (
    <>
      <button
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: 56,
          height: 56,
          zIndex: 8000,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleButtonClick}
        className={`rounded-full border-2 border-[#FFF100] bg-[#003BFF] flex items-center justify-center select-none transition-transform ${isDragging ? 'scale-110' : 'hover:scale-105'} ${!hasOpenedChat ? 'animate-pulse-blue' : ''}`}
        style={{ boxShadow: '0 4px 20px rgba(0,59,255,0.5)' }}
      >
        {isOpen ? <XIcon size={22} className="text-white" /> : <MessageSquare size={22} className="text-white" />}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FFF100] border-2 border-white" />
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            ...panelPos,
            zIndex: 7999,
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid #E0E0E0',
            boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div className="flex items-center justify-between px-5 shrink-0"
            style={{ background: '#003BFF', height: 64, borderRadius: '20px 20px 0 0' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-heading font-bold text-sm" style={{ background: '#001E7A' }}>
                <Bot size={18} />
              </div>
              <div>
                <p className="font-heading font-bold text-sm text-white">EHub AI</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  <span className="text-xs text-white/60">Online</span>
                </div>
              </div>
            </div>
            <button onClick={toggleChat} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
              <ChevronDown size={20} className="text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#F5F5F5' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-heading font-bold shrink-0 mr-2 mt-1"
                    style={{ background: '#003BFF' }}>
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className="max-w-[75%]"
                  style={msg.role === 'user' ? {
                    background: '#003BFF',
                    color: '#FFFFFF',
                    borderRadius: '18px 18px 4px 18px',
                    padding: '10px 14px',
                    fontSize: 14,
                    lineHeight: 1.4,
                  } : {
                    background: '#FFFFFF',
                    color: '#111111',
                    border: '1px solid #E0E0E0',
                    borderRadius: '18px 18px 18px 4px',
                    padding: '10px 14px',
                    fontSize: 14,
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-heading font-bold shrink-0 mr-2 mt-1"
                  style={{ background: '#003BFF' }}>
                  <Bot size={14} />
                </div>
                <div className="px-4 py-3 rounded-[18px_18px_18px_4px]" style={{ background: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {showSuggestions && messages.length === 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
                {QUICK_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-[#003BFF] hover:text-white"
                    style={{ border: '1px solid #003BFF', color: '#003BFF' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderTop: '1px solid #E0E0E0', background: '#FFFFFF' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              className="flex-1 resize-none text-sm outline-none px-3.5 py-2.5 rounded-xl"
              style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', fontFamily: 'Inter, sans-serif', maxHeight: 80 }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-opacity"
              style={{ background: '#003BFF', opacity: !input.trim() || isLoading ? 0.5 : 1 }}
            >
              <ArrowRight size={18} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
