import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSavedListings } from '../../services/savedListingsService';
import { getListingById } from '../../services/listingsService';
import ListingCard from '../../components/listings/ListingCard';
import { Bookmark, Package } from 'lucide-react';

const AVAILABLE_STATUSES = ['active'];

export default function SavedListingsPage() {
  const { currentUser } = useAuth();
  const [savedListings, setSavedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const unsubscribe = getSavedListings(currentUser.uid, (listings) => {
      // Enrich with live status so reserved/sold/paused accounts drop out of Favourites.
      Promise.all(
        listings
          .filter((s) => s.listingSnapshot)
          .map(async (saved) => {
            let listing = {
              ...(saved.listingSnapshot || {}),
              id: saved.listingId,
              photos: saved.listingSnapshot?.photos || [],
              status: 'active',
              tier: saved.listingSnapshot?.tier,
              sellerDisplayName: saved.listingSnapshot?.sellerDisplayName,
            };
            try {
              const live = await getListingById(saved.listingId);
              if (live) listing = { ...listing, status: live.status || 'active' };
            } catch {
              // keep snapshot status
            }
            return listing;
          })
      ).then((listingDocs) => {
        setSavedListings(listingDocs.filter((l) => AVAILABLE_STATUSES.includes(l.status)));
        setLoading(false);
      });
    });
    return unsubscribe;
  }, [currentUser]);

  if (loading) {
    return (
      <div className="w-full max-w-screen overflow-x-hidden pt-[68px] pb-20 md:pb-0 min-h-screen bg-[#F5F5F5] animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="h-7 w-40 bg-konami-mid-gray rounded mb-6 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse bg-white/10 border border-konami-mid-gray">
                <div className="aspect-[16/9] bg-konami-mid-gray/70" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-2/3 bg-konami-mid-gray/70 rounded" />
                  <div className="h-4 w-1/2 bg-konami-mid-gray/70 rounded" />
                  <div className="h-9 w-full bg-konami-mid-gray/70 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen overflow-x-hidden pt-[68px] pb-20 md:pb-0 min-h-screen bg-[#F5F5F5] animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <div className="text-sm mb-4" style={{ color: '#6B7280' }}>
          <Link to="/" className="hover:underline" style={{ color: '#003BFF' }}>Home</Link>
          <span className="mx-2">{' > '}</span>
          <span style={{ color: '#111111' }}>Favourites</span>
        </div>

        <div className="mb-6">
          <h1 className="font-heading text-2xl md:text-[28px] font-extrabold" style={{ color: '#111111' }}>
            Favourites
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            {savedListings.length} {savedListings.length === 1 ? 'account' : 'accounts'} saved
          </p>
        </div>

        {savedListings.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Bookmark size={32} style={{ color: '#003BFF' }} />
            </div>
            <p className="font-heading text-lg font-bold mb-2" style={{ color: '#111111' }}>Nothing saved yet</p>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              Tap the bookmark icon on any listing to save it for later
            </p>
            <Link to="/browse" className="btn-primary inline-flex items-center gap-2">
              <Package size={16} /> Browse Accounts
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}