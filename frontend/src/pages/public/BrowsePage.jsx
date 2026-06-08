import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Loader } from 'lucide-react';
import { useListings } from '../../hooks/useListings';
import ListingGrid from '../../components/listings/ListingGrid';
import ListingFilters, { MobileFilterDrawer } from '../../components/listings/ListingFilters';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtersFromParams = useCallback(() => {
    const tier = searchParams.get('tier');
    return {
      searchQuery: searchParams.get('q') || '',
      tier: tier ? tier.split(',') : [],
      platform: searchParams.get('platform') || 'all',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      sortBy: searchParams.get('sort') || 'newest',
    };
  }, [searchParams]);

  const [currentFilters, setCurrentFilters] = useState(filtersFromParams);

  useEffect(() => {
    setCurrentFilters(filtersFromParams());
  }, [filtersFromParams]);

  const { listings, loading, hasMore, loadMore } = useListings(currentFilters);

  const handleFiltersChange = (newFilters) => {
    const params = {};
    if (newFilters.searchQuery) params.q = newFilters.searchQuery;
    if (newFilters.tier?.length) params.tier = newFilters.tier.join(',');
    if (newFilters.platform && newFilters.platform !== 'all') params.platform = newFilters.platform;
    if (newFilters.minPrice) params.minPrice = newFilters.minPrice;
    if (newFilters.maxPrice) params.maxPrice = newFilters.maxPrice;
    if (newFilters.sortBy && newFilters.sortBy !== 'newest') params.sort = newFilters.sortBy;
    setSearchParams(params, { replace: true });
    setCurrentFilters(newFilters);
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
    setCurrentFilters({ searchQuery: '', tier: [], platform: 'all', minPrice: '', maxPrice: '', sortBy: 'newest' });
  };

  return (
    <div className="pt-[68px] min-h-screen" style={{ background: '#F5F5F5' }}>
      <div className="section-blue px-4 pt-[60px] pb-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-[40px] md:text-[48px] font-heading font-extrabold text-white uppercase">BROWSE ACCOUNTS</h1>
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-heading font-bold" style={{ background: '#FFFFFF', color: '#003BFF' }}>
            Showing {listings.length} accounts
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
        <div className="flex gap-6">
          <div className="hidden md:block w-[280px] shrink-0">
            <div className="sticky top-20 bg-white rounded-2xl shadow-card border border-konami-mid-gray p-5">
              <ListingFilters
                filters={currentFilters}
                onFiltersChange={handleFiltersChange}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden btn-blue flex items-center gap-2 text-sm !py-3"
              >
                <SlidersHorizontal size={16} />
                Filters
              </button>
            </div>

            <ListingGrid
              listings={listings}
              loading={loading}
              emptyMessage="No accounts match your filters"
              onClearFilters={clearFilters}
            />

            {hasMore && !loading && (
              <div className="flex justify-center mt-8">
                <button onClick={loadMore} className="btn-blue flex items-center gap-2">
                  <Loader size={16} />
                  Load More
                </button>
              </div>
            )}

            {loading && hasMore && (
              <div className="flex justify-center mt-8">
                <div className="w-8 h-8 border-3 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={currentFilters}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  );
}
