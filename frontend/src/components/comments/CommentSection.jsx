import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
  collection, addDoc, query, where, orderBy, limit, getDocs,
  serverTimestamp
} from 'firebase/firestore';
import {
  subscribeToComments, postComment, toggleLike,
} from '../../services/commentsService';
import CommentInput from './CommentInput';
import CommentItem from './CommentItem';
import { MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommentSection({ listingId, sellerId }) {
  const { currentUser, userProfile } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showCount, setShowCount] = useState(10);

  // Subscribe to comments
  useEffect(() => {
    if (!listingId) return;
    const unsub = subscribeToComments(listingId, (data) => {
      setComments(data);
      setLoading(false);
    });
    return unsub;
  }, [listingId]);

  // Separate top-level and replies
  const topLevel = comments.filter(c => !c.parentId);
  const getReplies = (commentId) => comments.filter(c => c.parentId === commentId);

  const handlePost = async (content, mentions) => {
    if (!currentUser) {
      toast.error('Login to comment');
      return;
    }
    try {
      await postComment(listingId, {
        authorId: currentUser.uid,
        authorDisplayName: userProfile?.displayName || currentUser.displayName,
        authorUsername: userProfile?.username || '',
        authorPhotoURL: userProfile?.photoURL || currentUser.photoURL || null,
        content,
        mentions,
        parentId: replyingTo?.id || null,
      });
      setReplyingTo(null);
      toast.success(replyingTo ? 'Reply posted' : 'Comment posted');

      // Send mention notifications
      if (mentions && mentions.length > 0) {
        for (const uid of mentions) {
          if (uid === currentUser.uid) continue;
          await addDoc(collection(db, 'notifications'), {
            userId: uid,
            title: 'You were mentioned',
            message: `${userProfile?.displayName || 'Someone'} mentioned you in a comment.`,
            type: 'mention',
            listingId,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      // Send reply notification to parent comment author
      if (replyingTo && replyingTo.authorId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: replyingTo.authorId,
          title: 'New reply to your comment',
          message: `${userProfile?.displayName || 'Someone'} replied to your comment.`,
          type: 'reply',
          listingId,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

    } catch (err) {
      toast.error(err.message || 'Failed to post comment');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 mt-6">

      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-bold text-gray-900 text-xl uppercase tracking-wide">
            Discussion
          </h3>
          <p className="text-gray-500 text-sm mt-0.5">
            {comments.length} comment{comments.length !== 1 ? 's' : ''} · Public
          </p>
        </div>
        {/* Seller badge legend */}
        <div className="flex items-center gap-1.5 bg-[#003BFF]/10 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-[#003BFF]" />
          <span className="text-[#003BFF] text-xs font-heading font-bold uppercase">
            = Seller
          </span>
        </div>
      </div>

      {/* Post a comment input */}
      <div className="mb-6">
{currentUser
          ? <CommentInput
              onSubmit={handlePost}
              placeholder={replyingTo
                ? `Reply to @${replyingTo.authorUsername}...`
                : "Ask a question, make an offer, or leave a comment..."}
              replyingTo={replyingTo}
            />
          : <div className="flex items-center gap-3 bg-gray-50 border border-gray-200
                          rounded-xl p-4">
              <MessageSquare size={20} className="text-gray-400" />
              <p className="text-gray-500 text-sm flex-1">
                <Link to="/login" className="text-[#003BFF] font-semibold hover:underline">
                  Login
                </Link>
                {' '}to join the discussion
              </p>
            </div>
        }
      </div>

      {/* Comments list */}
      {loading
        ? <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        : topLevel.length === 0
          ? <div className="text-center py-12">
              <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-heading font-bold uppercase text-sm tracking-wide">
                No comments yet
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Be the first to ask a question or make an offer
              </p>
            </div>
          : <div className="space-y-6">
              {topLevel.slice(0, showCount).map(comment => {
                const replies = getReplies(comment.id);
                const isSeller = comment.authorId === sellerId;
                return (
                  <div key={comment.id}>
                    {/* Seller badge on seller's comments */}
                    {isSeller && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#003BFF]" />
                        <span className="text-[#003BFF] text-[11px] font-heading font-bold uppercase tracking-wide">
                          Seller
                        </span>
                      </div>
                    )}
                    <CommentItem
                      comment={comment}
                      listingId={listingId}
                      currentUser={currentUser}
                      onReply={setReplyingTo}
                    />
                    {/* Replies — indented */}
                    {replies.length > 0 && (
                      <div className="ml-11 mt-3 space-y-3 border-l-2 border-gray-100 pl-4">
                        {replies.map(reply => (
                          <CommentItem
                            key={reply.id}
                            comment={reply}
                            listingId={listingId}
                            currentUser={currentUser}
                            onReply={setReplyingTo}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Load more */}
              {topLevel.length > showCount && (
                <button
                  onClick={() => setShowCount(prev => prev + 10)}
                  className="w-full py-3 text-[#003BFF] font-heading font-bold text-sm
                             uppercase tracking-wide border border-[#003BFF]/30
                             rounded-xl hover:bg-[#003BFF]/5 transition-colors"
                >
                  Show {topLevel.length - showCount} more comments
                </button>
              )}
            </div>
      }
    </div>
  );
}