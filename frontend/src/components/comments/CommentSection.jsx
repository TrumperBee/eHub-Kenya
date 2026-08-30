import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  subscribeToComments, fetchOlderComments, postComment, COMMENTS_PAGE
} from '../../services/commentsService';
import CommentInput from './CommentInput';
import CommentItem from './CommentItem';
import { MessageSquare, CornerUpLeft, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const GAP_MS = 5 * 60 * 1000;

const commentMs = (c) => {
  if (!c?.createdAt) return 0;
  if (typeof c.createdAt?.toMillis === 'function') return c.createdAt.toMillis();
  if (c.createdAt instanceof Date) return c.createdAt.getTime();
  const parsed = new Date(c.createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const dayLabel = (c) => {
  const ms = commentMs(c);
  if (!ms) return '';
  const d = new Date(ms);
  const today = new Date();
  const sameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameDay(d, today)) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-GB', opts);
};

const wallpaper = {
  backgroundImage: 'radial-gradient(rgba(0,59,255,0.07) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
  backgroundColor: '#F4F5F7',
};

export default function CommentSection({ listingId, sellerId }) {
  const { currentUser, userProfile } = useAuth();
  const [live, setLive] = useState([]);
  const [older, setOlder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const threadRef = useRef(null);
  const lastIdRef = useRef(null);
  const firstScrollRef = useRef(true);
  const pendingScrollH = useRef(0);

  const display = [...older, ...live];

  useEffect(() => {
    if (!listingId) return;
    setLoading(true);
    const unsub = subscribeToComments(listingId, (data) => {
      setLive([...data].reverse());
      setHasMoreOlder(data.length >= COMMENTS_PAGE);
      setLoading(false);
    });
    return unsub;
  }, [listingId]);

  const scrollToBottom = (smooth = false) => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (!display.length) return;
    const last = display[display.length - 1];
    if (firstScrollRef.current) {
      firstScrollRef.current = false;
      lastIdRef.current = last.id;
      scrollToBottom(false);
      return;
    }
    const isNew = lastIdRef.current !== last.id;
    if (!isNew) return;
    lastIdRef.current = last.id;
    const weSent = last.authorId === currentUser?.uid;
    if (atBottom || weSent) {
      scrollToBottom(true);
    } else {
      setNewCount(n => n + 1);
    }
  }, [display, atBottom, currentUser?.uid]);

  useEffect(() => {
    if (pendingScrollH.current > 0) {
      const el = threadRef.current;
      if (el) el.scrollTop += el.scrollHeight - pendingScrollH.current;
      pendingScrollH.current = 0;
    }
  }, [older]);

  const handleScroll = () => {
    const el = threadRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    setAtBottom(nearBottom);
    if (nearBottom) setNewCount(0);
  };

  const handleLoadOlder = async () => {
    if (loadingOlder || !listingId) return;
    const oldest = display[0];
    if (!oldest?.createdAt) return;
    const el = threadRef.current;
    const prevH = el ? el.scrollHeight : 0;
    setLoadingOlder(true);
    try {
      const olderBatch = await fetchOlderComments(listingId, oldest.createdAt, COMMENTS_PAGE);
      const ordered = [...olderBatch].reverse();
      if (ordered.length === 0) {
        setHasMoreOlder(false);
        return;
      }
      if (ordered.length < COMMENTS_PAGE) setHasMoreOlder(false);
      pendingScrollH.current = prevH;
      setOlder(prev => [...ordered, ...prev]);
    } catch (err) {
      toast.error('Failed to load earlier messages');
    } finally {
      setLoadingOlder(false);
    }
  };

  const scrollToComment = (commentId) => {
    const el = threadRef.current?.querySelector(`[data-comment-id="${commentId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handlePost = async (content, mentions) => {
    if (content === 'cancel-reply') {
      setReplyingTo(null);
      return;
    }
    if (!currentUser) {
      toast.error('Login to comment');
      return;
    }
    const replyTarget = replyingTo;
    try {
      const replyTo = replyTarget ? {
        commentId: replyTarget.id,
        authorDisplayName: replyTarget.authorDisplayName,
        authorUsername: replyTarget.authorUsername,
        content: replyTarget.content ? replyTarget.content.slice(0, 120) : '',
      } : null;

      await postComment(listingId, {
        authorId: currentUser.uid,
        authorDisplayName: userProfile?.displayName || currentUser.displayName,
        authorUsername: userProfile?.username || '',
        authorPhotoURL: userProfile?.photoURL || currentUser.photoURL || null,
        content,
        mentions,
        parentId: replyTarget?.id || null,
        replyTo,
      });
      setReplyingTo(null);
      toast.success(replyTarget ? 'Reply sent' : 'Message sent');

      if (mentions && mentions.length > 0) {
        for (const uid of mentions) {
          if (uid === currentUser.uid) continue;
          await addDoc(collection(db, 'notifications'), {
            userId: uid,
            title: 'You were mentioned',
            message: `${userProfile?.displayName || 'Someone'} mentioned you in the discussion.`,
            type: 'mention',
            listingId,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      if (replyTarget && replyTarget.authorId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: replyTarget.authorId,
          title: 'New reply to your message',
          message: `${userProfile?.displayName || 'Someone'} replied to your message.`,
          type: 'reply',
          listingId,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to post message');
    }
  };

  let lastDay = null;
  const items = [];
  display.forEach((c, i) => {
    const prev = display[i - 1];
    const next = display[i + 1];
    const day = dayLabel(c);
    if (day && day !== lastDay) {
      items.push(
        <div key={`day-${c.id}`} className="flex justify-center my-3">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-gray-500 bg-white/95 border border-gray-200 rounded-full px-3 py-1 shadow-sm">
            {day}
          </span>
        </div>
      );
      lastDay = day;
    }
    const cMs = commentMs(c);
    const prevMs = commentMs(prev);
    const nextMs = commentMs(next);
    const isStart = !prev || prev.authorId !== c.authorId || (cMs - prevMs) > GAP_MS;
    const isEnd = !next || next.authorId !== c.authorId || (nextMs - cMs) > GAP_MS;
    items.push(
      <CommentItem
        key={c.id}
        comment={c}
        listingId={listingId}
        currentUser={currentUser}
        sellerId={sellerId}
        onReply={setReplyingTo}
        isStart={isStart}
        isEnd={isEnd}
        onScrollToComment={scrollToComment}
      />
    );
  });

  return (
    <div className="bg-white rounded-2xl shadow-card mt-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4" style={{ background: '#003BFF' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <MessageSquare size={18} className="text-[#FFF100]" />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-white uppercase tracking-wide text-lg leading-none">Discussion</p>
            <p className="text-xs text-white/70 mt-0.5 truncate">
              Public group · {display.length} message{display.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: '#FFF100' }} />
          <span className="text-[#FFF100] text-[11px] font-heading font-bold uppercase">= Seller</span>
        </div>
      </div>

      <div ref={threadRef} onScroll={handleScroll} style={wallpaper} className="relative overflow-y-auto max-h-[480px] min-h-[320px] px-3 py-3">
        {loading ? (
          <div className="space-y-3 pt-2">
            <div className="flex justify-end">
              <div className="w-48 h-12 bg-gray-200/80 rounded-2xl rounded-br-md animate-pulse" />
            </div>
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse mr-2" />
              <div className="w-56 h-16 bg-gray-200/80 rounded-2xl rounded-bl-md animate-pulse" />
            </div>
            <div className="flex justify-start pl-10">
              <div className="w-40 h-12 bg-gray-200/80 rounded-2xl rounded-bl-md animate-pulse ml-2" />
            </div>
          </div>
        ) : display.length === 0 ? (
          <div className="text-center py-14">
            <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-heading font-bold uppercase text-sm tracking-wide">No messages yet</p>
            <p className="text-gray-400 text-sm mt-1">Start the conversation — ask a question or make an offer</p>
          </div>
        ) : (
          <div>
            {hasMoreOlder && (
              <div className="flex justify-center pb-2">
                <button
                  onClick={handleLoadOlder}
                  disabled={loadingOlder}
                  className="flex items-center gap-1.5 text-xs font-heading font-bold uppercase tracking-wide text-[#003BFF] bg-white/95 border border-gray-200 rounded-full px-4 py-2 shadow-sm hover:bg-[#003BFF] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingOlder ? <Loader2 size={13} className="animate-spin" /> : <CornerUpLeft size={13} />}
                  Load earlier messages
                </button>
              </div>
            )}
            {items}
          </div>
        )}

        {newCount > 0 && (
          <button
            onClick={() => { setNewCount(0); setAtBottom(true); scrollToBottom(true); }}
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1 text-xs font-bold text-white rounded-full px-3 py-1.5 shadow-lg animate-fade-in"
            style={{ background: '#003BFF' }}
          >
            {newCount} new message{newCount > 1 ? 's' : ''} <ChevronDown size={14} />
          </button>
        )}
      </div>

      <div className="border-t border-gray-100 p-3" style={{ background: '#FFFFFF' }}>
        {currentUser ? (
          <CommentInput
            onSubmit={handlePost}
            placeholder={replyingTo
              ? `Reply to @${replyingTo.authorUsername || replyingTo.authorDisplayName}...`
              : 'Message the group...'}
            replyingTo={replyingTo}
          />
        ) : (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#F5F5F5', border: '1px solid #E5E7EB' }}>
            <MessageSquare size={18} className="text-gray-400 flex-shrink-0" />
            <p className="text-gray-500 text-sm flex-1">
              <Link to="/login" className="text-[#003BFF] font-semibold hover:underline">Login</Link>
              {' '}to join the discussion
            </p>
          </div>
        )}
      </div>
    </div>
  );
}