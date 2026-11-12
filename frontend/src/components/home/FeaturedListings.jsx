import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useFeaturedListings } from '../../hooks/useListings';
import ListingCard from '../listings/ListingCard';

function FeaturedSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse bg-white/10 border border-konami-mid-gray">
      <div className="aspect-[16/9] bg-konami-mid-gray/70" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 bg-konami-mid-gray/70 rounded" />
        <div className="h-4 w-1/2 bg-konami-mid-gray/70 rounded" />
        <div className="h-9 w-full bg-konami-mid-gray/70 rounded-xl" />
      </div>
    </div>
  );
}

export default function FeaturedListings() {
  const { listings, loading } = useFeaturedListings();

  return (
    <section className="py-10 md:py-16 section-light w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-3">
          <h2 className="section-heading section-heading-dark yellow-underline inline-block">
            Featured Accounts
          </h2>
        </div>
        <p className="text-center text-konami-text-muted text-base mb-10">
          Hand-picked premium eFootball accounts from verified sellers
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <FeaturedSkeleton key={i} />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-10">
            <Package size={36} className="mx-auto mb-3 text-konami-text-muted" />
            <p className="font-heading text-sm font-bold uppercase tracking-wide text-konami-text mb-1">No featured accounts yet</p>
            <p className="text-sm text-konami-text-muted">Browse the marketplace to see every available account.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.slice(0, 6).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            <div className="md:hidden flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
              {listings.slice(0, 6).map((listing) => (
                <div key={listing.id} className="min-w-[280px] snap-start">
                  <ListingCard listing={listing} />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="text-center mt-8">
          <Link to="/browse" className="btn-blue">
            View All Accounts
          </Link>
        </div>
      </div>
    </section>
  );
}
