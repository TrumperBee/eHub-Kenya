import { useState } from 'react';
import { Heart, CornerDownRight, X, Pen, AlertTriangle } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';
import { toggleLike, deleteComment, editComment } from '../../services/commentsService';
import CommentInput from './CommentInput';
import toast from 'react-hot-toast';

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <h3 className="font-heading font-bold text-gray-900">Confirm Delete</h3>
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

const renderContent = (text) => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} className="text-[#003BFF] font-semibold">{part}</span>;
    }
    return part;
  });
};

export default function CommentItem({ comment, listingId, currentUser, onReply }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isOwn = currentUser?.uid === comment.authorId;
  const isLiked = currentUser && comment.likedBy?.includes(currentUser.uid);

  const handleLike = async () => {
    if (!currentUser) {
      toast.error('Login to like comments');
      return;
    }
    try {
      await toggleLike(listingId, comment.id, currentUser.uid, isLiked);
    } catch (err) {
      toast.error('Failed to like comment');
    }
  };

  const handleDelete = async () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    try {
      await deleteComment(listingId, comment.id);
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
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
      toast.success('Comment updated');
    } catch (err) {
      toast.error('Failed to update comment');
    }
  };

  return (
    <div>
      <div className="flex gap-3 group">

        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {comment.authorPhotoURL
            ? <img src={comment.authorPhotoURL}
                   className="w-8 h-8 rounded-full object-cover border border-gray-100" alt="" />
            : <div className="w-8 h-8 rounded-full bg-[#003BFF] flex items-center justify-center">
                <span className="text-white font-heading font-bold text-xs">
                  {comment.authorDisplayName?.[0]?.toUpperCase()}
                </span>
              </div>
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Name + username + time */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-heading font-bold text-gray-900 text-sm">
              {comment.authorDisplayName}
            </span>
            <span className="text-gray-400 text-xs">@{comment.authorUsername}</span>
            <span className="text-gray-400 text-xs">{formatRelativeTime(comment.createdAt)}</span>
            {comment.edited && (
              <span className="text-gray-400 text-[11px] italic">(edited)</span>
            )}
          </div>

          {/* Comment text or edit input */}
          {isEditing
            ? <div className="mt-1">
                <CommentInput
                  initialValue={editContent}
                  onSubmit={handleSaveEdit}
                  placeholder="Edit your comment..."
                  autoFocus
                />
                <button onClick={() => setIsEditing(false)}
                        className="text-gray-400 text-xs mt-1 hover:text-gray-600">
                  Cancel
                </button>
              </div>
            : <p className="text-gray-700 text-sm mt-0.5 leading-relaxed break-words">
                {renderContent(comment.content)}
              </p>
          }

          {/* Action row */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-1.5">

              {/* Like button */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 text-xs transition-colors
                            ${isLiked ? 'text-[#003BFF] font-semibold' : 'text-gray-400 hover:text-[#003BFF]'}`}
              >
                <Heart size={13} className={isLiked ? 'fill-[#003BFF]' : ''} />
                {comment.likes > 0 && <span>{comment.likes}</span>}
              </button>

              {/* Reply button */}
              {currentUser && (
                <button
                  onClick={() => onReply(comment)}
                  className="text-gray-400 hover:text-[#003BFF] text-xs flex items-center gap-1 transition-colors"
                >
                  <CornerDownRight size={13} />
                  Reply
                </button>
              )}

              {/* Own comment: edit + delete */}
              {isOwn && (
                <>
                  <button
                    onClick={() => { setEditContent(comment.content); setIsEditing(true); }}
                    className="text-gray-400 hover:text-[#003BFF] text-xs transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Pen size={11} className="mr-0.5" /> Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-gray-400 hover:text-red-500 text-xs transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={11} className="mr-0.5" /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          message="Are you sure you want to delete this comment?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}