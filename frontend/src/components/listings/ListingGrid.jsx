import ListingCard from './ListingCard';

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="aspect-[16/9] bg-[#242424]" />
      <div className="p-3 space-y-3">
        <div className="flex gap-2">
          <div className="h-4 bg-[#242424] rounded w-24" />
          <div className="h-4 bg-[#242424] rounded w-12" />
        </div>
        <div className="h-4 bg-[#242424] rounded w-full" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 bg-[#242424] rounded-lg" />
          <div className="h-10 bg-[#242424] rounded-lg" />
          <div className="h-10 bg-[#242424] rounded-lg" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 bg-[#242424] rounded w-16" />
          <div className="h-5 bg-[#242424] rounded w-14" />
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#2A2A2A]">
          <div className="h-6 bg-[#242424] rounded w-20" />
          <div className="h-9 bg-[#242424] rounded w-24" />
        </div>
      </div>
    </div>
  );
}

export default function ListingGrid({ listings, loading, emptyMessage = 'No listings found', onClearFilters }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="text-5xl mb-4">⚽</span>
        <p className="text-[#9E9E9E] text-lg mb-4">{emptyMessage}</p>
        {onClearFilters && (
          <button onClick={onClearFilters} className="text-sm text-[#BF0021] hover:text-[#E0001B] transition-colors">
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
