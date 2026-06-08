import { useState } from 'react';
import { Star } from 'lucide-react';

export default function ReviewForm({ onSubmit, loading }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) return;
    onSubmit({ rating, comment });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm text-[#9E9E9E] mb-2">Your Rating</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5 transition-colors"
            >
              <Star
                size={20}
                fill={(hover || rating) >= star ? '#D4AF37' : 'none'}
                color={(hover || rating) >= star ? '#D4AF37' : '#2A2A2A'}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <textarea
          placeholder="Write your review (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="input-field min-h-[80px] resize-y"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={rating === 0 || loading}
        className="btn-primary text-sm"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
