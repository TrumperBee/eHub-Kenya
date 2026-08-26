import { Star, CheckCircle } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';

export default function ReviewCard({ review, showListingTitle }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);
  const initials = (review.buyerDisplayName || 'A')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-heading font-bold shrink-0"
          style={{ background: '#003BFF' }}>
          {review.buyerPhotoURL ? (
            <img src={review.buyerPhotoURL} alt="" className="w-full h-full rounded-full object-cover" />
          ) : initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: '#111111' }}>
                {review.buyerDisplayName || 'Anonymous'}
              </span>
              {review.buyerUsername && (
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                  @{review.buyerUsername}
                </span>
              )}
              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase"
                  style={{ background: '#DCFCE7', color: '#166534' }}>
                  <CheckCircle size={9} className="flex-shrink-0" />
                  Verified Purchase
                </span>
              )}
            </div>
            <span className="text-xs shrink-0" style={{ color: '#9CA3AF' }}>
              {formatRelativeTime(review.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {stars.map((filled, i) => (
              <Star key={i} size={13} className={filled ? 'text-[#FFF100] fill-current' : 'text-gray-300'} />
            ))}
          </div>
          {review.comment && (
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#374151' }}>{review.comment}</p>
          )}
          {showListingTitle && review.listingTitle && (
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
              Purchased: {review.listingTitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}