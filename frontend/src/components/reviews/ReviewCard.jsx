import { Star } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';

export default function ReviewCard({ review }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);

  return (
    <div className="p-4 bg-white rounded-xl border border-konami-mid-gray shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-konami-text">{review.buyerDisplayName || 'Anonymous'}</span>
        <span className="text-xs text-konami-text-muted">{formatRelativeTime(review.createdAt)}</span>
      </div>
      <div className="flex items-center gap-0.5 mb-2">
        {stars.map((filled, i) => (
          <span key={i} className={`text-sm ${filled ? 'text-konami-gold' : 'text-konami-mid-gray'}`}><Star size={14} className={filled ? 'text-konami-gold fill-current' : 'text-konami-mid-gray'} /></span>
        ))}
      </div>
      {review.comment && (
        <p className="text-sm text-konami-text-muted">{review.comment}</p>
      )}
    </div>
  );
}
