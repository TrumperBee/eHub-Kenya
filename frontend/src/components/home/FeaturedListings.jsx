import { Link } from 'react-router-dom';
import { useFeaturedListings } from '../../hooks/useListings';
import ListingCard from '../listings/ListingCard';

export default function FeaturedListings() {
  const { listings, loading } = useFeaturedListings();

  return (
    <section className="py-16 section-light">
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
          <div className="flex justify-center">
            <div className="w-8 h-8 border-3 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
          </div>
        ) : listings.length === 0 ? (
          <p className="text-center text-konami-text-muted">No featured listings yet.</p>
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
