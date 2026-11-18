import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../utils/constants';

const STARS = [1, 2, 3, 4, 5];

/**
 * Shared feedback dialog. Mount it conditionally (`{open && <FeedbackModal .../>}`)
 * so the form state resets between visits. The sender's name/username/email are
 * resolved server-side from the uid — the modal only sends the uid.
 */
export default function FeedbackModal({ onClose }) {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const closeTimer = useRef(null);

  // Escape closes, and the page behind the modal should not scroll.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please tell us what you would like to see improved.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${BACKEND_URL}/api/feedback`, {
        message: trimmed,
        rating,
        userId: currentUser?.uid || 'anonymous',
        page: window.location.pathname,
      });
      setSent(true);
      // Give the success message a moment to be read before disappearing.
      closeTimer.current = setTimeout(onClose, 2000);
    } catch (err) {
      const serverMessage = err?.response?.data?.error;
      setError(
        serverMessage ||
          (err?.response?.status === 429
            ? 'Too many submissions from this network. Please try again later.'
            : 'Could not send your feedback. Please check your connection and try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            <h2 id="feedback-title" className="font-heading font-bold text-lg" style={{ color: '#111111' }}>
              Share Your Thoughts
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
              Help us improve eHub Market
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback form"
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: '#6B7280' }}
          >
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <p className="px-5 py-10 text-center text-sm font-semibold" style={{ color: '#047857' }}>
            Thanks! Your feedback helps us improve. 🙌
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 pb-5 pt-4 space-y-4">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 500))}
              placeholder="What would you like to see improved?"
              rows={4}
              maxLength={500}
              autoFocus
              className="input-field resize-none w-full"
              aria-label="Your feedback"
            />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1" role="group" aria-label="Rate eHub Market">
                {STARS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(rating === value ? null : value)}
                    aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    aria-pressed={rating === value}
                    className="text-2xl leading-none transition-transform hover:scale-110"
                    style={{ color: rating && value <= rating ? '#FFF100' : 'rgba(17, 17, 17, 0.2)' }}
                  >
                    ★
                  </button>
                ))}
              </div>
              <span className="text-xs tabular-nums" style={{ color: '#9CA3AF' }}>
                {message.length}/500
              </span>
            </div>

            {error && (
              <p className="text-xs" style={{ color: '#DC2626' }} role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="btn-blue w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
