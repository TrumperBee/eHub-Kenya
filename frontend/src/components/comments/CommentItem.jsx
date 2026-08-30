import { useState } from 'react';
import { Heart, Pen, X, AlertTriangle, CornerDownRight } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';
import { toggleLike, deleteComment, editComment } from '../../services/commentsService';
import toast from 'react-hot-toast';

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <h3 className="font-heading font-bold text-gray-900">Delete message?</h3>
      </div>
      <p className="text-gray-600 text-sm mb-4">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">
          Cancel
        </button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors">
          Delete
        </button>
      </div>
    </div>
  </div>
);

const renderContent = (text, mentionColor) => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} className="font-semibold" style={{ color: mentionColor }}>{part}</span>;
    }
    return part;
  });
};

export default function CommentItem({
  comment, listingId, currentUser, sellerId,
  onReply, isStart, isEnd, onScrollToComment,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isOwn = currentUser?.uid === comment.authorId;
  const isLiked = currentUser && comment.likedBy?.includes(currentUser.uid);
  const isSeller = comment.authorId === sellerId;
  const quote = comment.replyTo;
  const hasQuote = quote && quote.commentId && (quote.content || quote.authorDisplayName);

  const handleLike = async () => {
    if (!currentUser) {
      toast.error('Login to like messages');
      return;
    }
    try {
      await toggleLike(listingId, comment.id, currentUser.uid, isLiked);
    } catch (err) {
      toast.error('Failed to like message');
    }
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    try {
      await deleteComment(listingId, comment.id);
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      const mentionRegex = /@(\w+)/g;
      const newMentions = [];
      let match;
      while ((match = mentionRegex.exec(editContent)) !== null) {
        newMentions.push(match[1].toLowerCase());
      }
      await editComment(listingId, comment.id, editContent.trim(), newMentions);
      setIsEditing(false);
      toast.success('Message updated');
    } catch (err) {
      toast.error('Failed to update message');
    }
  };

  const bubbleClass = [
    'relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap transition-all duration-150',
    isOwn
      ? 'bg-[#003BFF] text-white rounded-br-md'
      : 'bg-white border border-gray-200 text-[#111111] rounded-bl-md',
    isStart
      ? (isOwn ? 'rounded-tr-md' : 'rounded-tl-md')
      : '',
    isEnd && !isOwn ? 'rounded-bl-sm' : '',
    isEnd && isOwn ? 'rounded-br-sm' : '',
    isOwn ? 'group-hover:shadow-md' : 'group-hover:shadow-md',
  ].join(' ');

  const nameColor = isSeller ? '#003BFF' : isOwn ? 'rgba(255,255,255,0.95)' : '#111111';

  return (
    <>
      <div className={`flex px-0.5 ${isOwn ? 'justify-end' : 'justify-start'} ${isStart ? 'mt-3 first:mt-0' : 'mt-0.5'}`} data-comment="true" data-comment-id={comment.id}>
        {!isOwn && isStart && (
          <div className="mr-2 self-end flex-shrink-0">
            {comment.authorPhotoURL ? (
              <img
                src={comment.authorPhotoURL}
                className={`w-8 h-8 rounded-full object-cover border border-gray-200 ${isSeller ? 'ring-2' : ''}`}
                style={isSeller ? { borderColor: '#003BFF' } : {}}
                alt=""
              />
            ) : (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-heading font-bold text-xs ${isSeller ? '' : 'bg-gray-300'}`}
                style={isSeller ? { background: '#003BFF' } : {}}>
                {comment.authorDisplayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        )}

        {!isOwn && !isStart && <div className="w-8 mr-2 flex-shrink-0" />}

        <div className={`flex flex-col max-w-[78%] md:max-w-[68%] min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && isStart && (
            <div className="flex items-center gap-1.5 mb-1 ml-1">
              <span className="text-[12.5px] font-bold" style={{ color: nameColor }}>{comment.authorDisplayName || 'User'}</span>
              {isSeller && (
                <span className="text-[9px] font-heading font-bold uppercase tracking-wider bg-[#003BFF] text-white px-1.5 py-0.5 rounded-full">Seller</span>
              )}
            </div>
          )}

          <div className="group">
            <div className={bubbleClass}>
              {hasQuote && (
                <button
                  onClick={() => onScrollToComment?.(quote.commentId)}
                  className="block w-full text-left mb-1.5 rounded-lg px-2.5 py-1.5 transition-colors"
                  style={{
                    background: isOwn ? 'rgba(255,255,255,0.14)' : '#F1F5FF',
                    borderLeft: '3px solid #003BFF',
                  }}
                  title="Tap to jump to the original message"
                >
                  <p className="text-[11px] font-bold truncate" style={{ color: isOwn ? '#FFFFFF' : '#003BFF' }}>
                    {quote.authorDisplayName || 'User'}
                  </p>
                  <p className="text-xs truncate" style={{ color: isOwn ? 'rgba(255,255,255,0.75)' : '#4B5563' }}>
                    {quote.content || '...'}
                  </p>
                </button>
              )}

              {isEditing ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    maxLength={500}
                    autoFocus
                    className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed"
                    style={{ color: isOwn ? '#FFFFFF' : '#111111' }}
                  />
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <button onClick={() => setIsEditing(false)}
                            className="text-xs font-medium hover:underline"
                            style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : '#6B7280' }}>
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editContent.trim()}
                      className="text-xs font-bold px-3 py-1 rounded-full transition-opacity disabled:opacity-40"
                      style={{ background: isOwn ? '#FFF100' : '#003BFF', color: isOwn ? '#111111' : '#FFFFFF' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="break-words whitespace-pre-wrap leading-relaxed">{renderContent(comment.content, isOwn ? '#FFF100' : '#003BFF')}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-between'}`}>
                    <span className="text-[10px]" style={{ color: isOwn ? 'rgba(255,255,255,0.65)' : '#9CA3AF' }}>
                      {formatRelativeTime(comment.createdAt)}{comment.edited ? ' (edited)' : ''}
                    </span>

                    {isOwn && (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditContent(comment.content); setIsEditing(true); }}
                          className="text-white/70 hover:text-white transition-colors"
                          aria-label="Edit message"
                        >
                          <Pen size={11} />
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="text-white/70 hover:text-red-300 transition-colors"
                          aria-label="Delete message"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {!isEditing && (
              <div className={`flex items-center gap-2 mt-0.5 px-1 ${isOwn ? 'justify-end' : ''}`}>
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1 text-[11px] transition-colors ${isLiked ? 'font-bold' : ''}`}
                  style={{ color: isLiked ? '#E11D48' : (isOwn ? 'rgba(255,255,255,0.5)' : '#9CA3AF') }}
                >
                  <Heart size={12} className={isLiked ? 'fill-[#E11D48]' : ''} />
                  {comment.likes > 0 && <span>{comment.likes}</span>}
                </button>
                {currentUser && (
                  <button
                    onClick={() => onReply(comment)}
                    className="flex items-center gap-1 text-[11px] transition-colors"
                    style={{ color: '#003BFF' }}
                  >
                    <CornerDownRight size={12} />
                    Reply
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          message="Are you sure you want to delete this message? This cannot be undone."
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}