import { SearchX } from 'lucide-react';
import ListingCard from './ListingCard';

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse bg-white/10">
      <div className="aspect-[16/9] bg-konami-mid-gray/70" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-4 bg-konami-mid-gray/70 rounded w-24" />
          <div className="h-4 bg-konami-mid-gray/70 rounded w-12" />
        </div>
        <div className="h-4 bg-konami-mid-gray/70 rounded w-full" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 bg-konami-mid-gray/70 rounded-lg" />
          <div className="h-10 bg-konami-mid-gray/70 rounded-lg" />
          <div className="h-10 bg-konami-mid-gray/70 rounded-lg" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 bg-konami-mid-gray/70 rounded w-16" />
          <div className="h-5 bg-konami-mid-gray/70 rounded w-14" />
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-konami-mid-gray">
          <div className="h-6 bg-konami-mid-gray/70 rounded w-20" />
          <div className="h-9 bg-konami-mid-gray/70 rounded w-24" />
        </div>
      </div>
    </div>
  );
}

export default function ListingGrid({ listings, loading, emptyMessage = 'No accounts found', onClearFilters }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 md:py-16 px-4 bg-white rounded-2xl border border-konami-mid-gray">
        <span className="w-14 h-14 rounded-full bg-konami-light-gray flex items-center justify-center mb-4">
          <SearchX size={26} className="text-konami-text-muted" />
        </span>
        <h3 className="font-heading text-base font-bold text-konami-text uppercase tracking-wide mb-1">
          {emptyMessage || 'No accounts found'}
        </h3>
        <p className="text-sm text-konami-text-muted mb-4">
          Try adjusting your filters or search terms.
        </p>
        {onClearFilters && (
          <button onClick={onClearFilters} className="btn-primary text-sm">
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
