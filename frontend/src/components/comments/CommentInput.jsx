import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, X, CornerDownRight } from 'lucide-react';
import { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete';
import toast from 'react-hot-toast';

const MAX_CHARS = 500;

export default function CommentInput({
  onSubmit,
  placeholder = 'Write a comment...',
  disabled = false,
  autoFocus = false,
  initialValue = '',
  replyingTo = null,
}) {
  const [content, setContent] = useState(initialValue);
  const [mentions, setMentions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const {
    suggestions,
    showSuggestions,
    setShowSuggestions,
    mentionStart,
    setMentionStart,
    handleTextChange,
  } = useMentionAutocomplete();

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (initialValue && !content) {
      setContent(initialValue);
    }
  }, [initialValue]);

  const handleChange = (e) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(newContent);
    handleTextChange(newContent, cursorPos);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectMention(suggestions[selectedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        return;
      }
    }

    // Shift+Enter = new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!showSuggestions) {
        handleFormSubmit(e);
      }
    }
  };

  const selectMention = (user) => {
    if (mentionStart === -1) return;
    const beforeMention = content.slice(0, mentionStart);
    const afterCursor = content.slice(mentionStart + 1); // +1 to skip @
    const afterWord = afterCursor.split(' ')[0]; // word being typed
    const newContent = beforeMention + `@${user.username} ` + afterCursor.slice(afterWord.length);
    setContent(newContent);
    setMentions(prev => [...prev, user.uid]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setMentionStart(-1);
    // Focus and move cursor to end
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newContent.length, newContent.length);
      }
    }, 0);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || disabled) return;
    if (content.trim().length < 1) return;
    const mentionMatches = content.match(/@(\w+)/g);
    const mentionUids = mentionMatches ? 
      mentionMatches.map(m => m.slice(1)).map(u => u.toLowerCase()) : [];
    onSubmit(content.trim(), mentionUids);
    setContent('');
    setMentions([]);
    if (replyingTo) {
      // Parent will clear replyingTo
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const charCount = content.length;
  const showCounter = charCount > 400;

  return (
    <div className="relative" ref={dropdownRef}>
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 rounded-xl px-3 py-2"
          style={{ background: '#F1F5FF', borderLeft: '3px solid #003BFF' }}>
          <CornerDownRight size={14} className="text-[#003BFF] flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#003BFF] truncate">
              Replying to @{replyingTo.authorUsername || replyingTo.authorDisplayName}
            </p>
            {replyingTo.content && (
              <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
            )}
          </div>
          <button onClick={() => onSubmit('cancel-reply', [])}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Cancel reply">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm
                       focus:outline-none transition-colors
                       bg-white"
          style={{
            borderColor: disabled ? '#E5E7EB' : '#E0E0E0',
            color: disabled ? '#9CA3AF' : '#111111',
            backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
            minHeight: '56px',
            maxHeight: '120px',
          }}
          rows={1}
          spellCheck={false}
          maxLength={MAX_CHARS}
        />

        <button
          onClick={() => !disabled && handleFormSubmit({ preventDefault: () => {} })}
          disabled={disabled || !content.trim() || showSuggestions}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-200 active:scale-95"
          style={{
            background: disabled || !content.trim() || showSuggestions ? '#E5E7EB' : '#003BFF',
            opacity: disabled || !content.trim() || showSuggestions ? 0.5 : 1,
          }}
          aria-label="Post comment"
        >
          <ArrowRight size={18} className="text-white" />
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200
                          max-h-48 overflow-y-auto">
            {suggestions.map((user, i) => (
              <button
                key={user.uid}
                onClick={() => selectMention(user)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left
                            transition-colors ${selectedIndex === i ? 'bg-[#003BFF]' : 'hover:bg-gray-50'}`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center
                                text-white text-xs font-heading font-bold flex-shrink-0"
                  style={{ background: user.photoURL ? 'transparent' : '#003BFF' }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    user.displayName?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`font-heading font-bold text-sm ${selectedIndex === i ? 'text-white' : 'text-gray-900'}`}>
                    {user.displayName}
                  </span>
                  <span className={`text-xs ${selectedIndex === i ? 'text-white/70' : 'text-gray-400'}`}>
                    @{user.username}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showCounter && (
        <div className="text-right mt-1">
          <span className="text-xs" style={{ color: charCount > MAX_CHARS ? '#EF4444' : '#9CA3AF' }}>
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      )}
    </div>
  );
}