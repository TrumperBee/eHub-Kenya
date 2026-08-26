import { useState, useCallback, useRef, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export const useMentionAutocomplete = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const debounceRef = useRef(null);

  const searchUsers = useCallback(async (searchText) => {
    if (!searchText || searchText.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', searchText.toLowerCase()),
        where('username', '<=', searchText.toLowerCase() + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (err) {
      console.warn('Mention search error:', err);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleTextChange = useCallback((text, cursorPos) => {
    // Find @ that starts a potential mention
    const beforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      setShowSuggestions(false);
      setMentionStart(-1);
      return;
    }

    // Check if there's a space after the @ (meaning the mention is complete)
    const afterAt = text.slice(lastAtIndex + 1, cursorPos);
    if (afterAt.includes(' ')) {
      setShowSuggestions(false);
      setMentionStart(-1);
      return;
    }

    const queryText = afterAt;
    setMentionStart(lastAtIndex);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchUsers(queryText);
    }, 200);
  }, [searchUsers]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    suggestions,
    showSuggestions,
    setShowSuggestions,
    mentionStart,
    setMentionStart,
    handleTextChange,
    searchUsers,
  };
};