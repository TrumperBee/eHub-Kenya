import { formatRelativeTime } from '../../utils/formatters';

export default function ReviewCard({ review }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);

  return (
    <div className="p-4 bg-[#242424] rounded-xl border border-[#2A2A2A]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{review.buyerDisplayName || 'Anonymous'}</span>
        <span className="text-xs text-[#5C5C5C]">{formatRelativeTime(review.createdAt)}</span>
      </div>
      <div className="flex items-center gap-0.5 mb-2">
        {stars.map((filled, i) => (
          <span key={i} className={`text-sm ${filled ? 'text-[#D4AF37]' : 'text-[#2A2A2A]'}`}>★</span>
        ))}
      </div>
      {review.comment && (
        <p className="text-sm text-[#9E9E9E]">{review.comment}</p>
      )}
    </div>
  );
}
