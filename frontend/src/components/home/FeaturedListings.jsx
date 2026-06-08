import { Link } from 'react-router-dom';
import { useFeaturedListings } from '../../hooks/useListings';
import ListingCard from '../listings/ListingCard';

export default function FeaturedListings() {
  const { listings, loading } = useFeaturedListings();

  return (
    <section className="py-16 bg-[#0D0D0D]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="section-heading">Featured Accounts</h2>
          <div className="w-16 h-1 bg-[#BF0021] mx-auto mt-3 rounded-full" />
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-3 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
          </div>
        ) : listings.length === 0 ? (
          <p className="text-center text-[#5C5C5C]">No featured listings yet.</p>
        ) : (
          <>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Link to="/browse" className="btn-secondary">
            View All Accounts
          </Link>
        </div>
      </div>
    </section>
  );
}
