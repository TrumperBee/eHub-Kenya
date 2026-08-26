import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSavedListings } from '../../services/savedListingsService';
import ListingCard from '../../components/listings/ListingCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Bookmark, Package } from 'lucide-react';

export default function SavedListingsPage() {
  const { currentUser } = useAuth();
  const [savedListings, setSavedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const unsubscribe = getSavedListings(currentUser.uid, (listings) => {
      setSavedListings(listings);
      setLoading(false);
    });
    return unsubscribe;
  }, [currentUser]);

  if (loading) return <div className="pt-[68px]"><LoadingSpinner fullScreen /></div>;

  return (
    <div className="pt-[68px] min-h-screen bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-sm mb-4" style={{ color: '#6B7280' }}>
          <Link to="/" className="hover:underline" style={{ color: '#003BFF' }}>Home</Link>
          <span className="mx-2">{' > '}</span>
          <span style={{ color: '#111111' }}>Saved Accounts</span>
        </div>

        <div className="mb-6">
          <h1 className="font-heading text-2xl md:text-[28px] font-extrabold" style={{ color: '#111111' }}>
            Saved Accounts
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
            <p className="font-heading text-lg font-bold mb-2" style={{ color: '#111111' }}>No saved accounts yet</p>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              Browse and tap the bookmark icon to save accounts for later
            </p>
            <Link to="/browse" className="btn-primary inline-flex items-center gap-2">
              <Package size={16} /> Browse Accounts
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedListings.map((saved) => {
              const snapshot = saved.listingSnapshot || {};
              const listing = {
                ...snapshot,
                id: saved.listingId,
                photos: snapshot.photos || [],
                status: 'active',
                sellerDisplayName: snapshot.sellerDisplayName,
                tier: snapshot.tier,
              };
              return <ListingCard key={saved.listingId} listing={listing} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}