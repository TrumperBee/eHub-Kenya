import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PauseCircle, PlayCircle, Trash2, Edit3, AlertTriangle, Package, Camera, MapPin } from 'lucide-react';
import { getSellerListings, updateListing, deleteListingSoft } from '../../../services/listingsService';
import { formatKES } from '../../../utils/formatters';
import toast from 'react-hot-toast';

function ListingsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-48" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingsError({ onRetry }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ background: '#FEF2F2', border: '1px solid #C8102E' }}>
      <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#C8102E' }} />
      <p className="text-sm font-medium mb-2" style={{ color: '#111' }}>Could not load your listings</p>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Check your connection and try again.</p>
      <button onClick={onRetry} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#003BFF', color: '#003BFF' }}>
        RETRY
      </button>
    </div>
  );
}

export default function ListingsTab({ profile, user, onTabChange }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSellerListings(profile.uid);
      setListings(data);
    } catch (err) {
      console.error('Listings fetch error:', err);
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTogglePause = async (listing) => {
    const newStatus = listing.status === 'active' ? 'paused' : 'active';
    try {
      await updateListing(listing.id, { status: newStatus });
      toast.success(newStatus === 'active' ? 'Listing is now live' : 'Listing paused');
      fetchData();
    } catch (err) {
      toast.error('Failed to update listing status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteListingSoft(deleteId);
      toast.success('Listing removed');
      setDeleteId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to remove listing');
    } finally {
      setDeleting(false);
    }
  };

  const activeListings = listings.filter(l => l.status !== 'removed');
  const filtered = statusFilter === 'all' ? activeListings : activeListings.filter(l => l.status === statusFilter);

  if (loading) return <ListingsSkeleton />;
  if (error) return <ListingsError onRetry={fetchData} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-heading text-2xl font-extrabold" style={{ color: '#111' }}>MY LISTINGS</h2>
        <button onClick={() => navigate('/transfer-room/new')} className="btn-primary flex items-center gap-2 text-sm" style={{ background: '#FFF100', color: '#111' }}>
          <Plus size={16} /> + NEW LISTING
        </button>
      </div>

      <div className="flex gap-1 rounded-xl p-1 overflow-x-auto" style={{ background: '#E0E0E0' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'paused', label: 'Paused' },
          { id: 'sold', label: 'Sold' },
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap min-h-[36px]"
            style={{
              background: statusFilter === filter.id ? '#003BFF' : 'transparent',
              color: statusFilter === filter.id ? '#FFFFFF' : '#6B7280',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {activeListings.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: '#EFF6FF', border: '1px dashed #003BFF' }}>
          <span className="text-5xl block mb-4"><Package size={48} /></span>
          <h3 className="font-heading text-xl font-extrabold mb-2" style={{ color: '#003BFF' }}>YOU HAVE NO LISTINGS YET</h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: '#6B7280' }}>
            Create your first listing to start selling. It takes less than 5 minutes. Add your squad photos, list your star players, set your price, and go live instantly.
          </p>
          <button onClick={() => navigate('/transfer-room/new')} className="btn-primary text-sm" style={{ background: '#FFF100', color: '#111' }}>
            + CREATE YOUR FIRST LISTING
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: '#6B7280' }}>No {statusFilter} listings found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(listing => (
            <div key={listing.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {listing.photos?.[0] ? (
                  <img src={listing.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-lg" style={{ background: '#F0F4FF' }}><Camera size={20} /></div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#111' }}>{listing.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{listing.tier} — {listing.platform} — {formatKES(listing.price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  listing.status === 'active' ? 'bg-green-100 text-green-700' :
                  listing.status === 'paused' ? 'bg-gray-100 text-gray-500' :
                  listing.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {listing.status === 'active' ? 'LIVE' :
                   listing.status === 'paused' ? 'PAUSED' :
                   listing.status === 'sold' ? 'SOLD' : listing.status}
                </span>
                {listing.viewCount > 0 && (
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>{listing.viewCount} views</span>
                )}
                <button
                  onClick={() => navigate(`/transfer-room/edit/${listing.id}`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[32px]"
                  style={{ borderColor: '#003BFF', color: '#003BFF' }}
                >
                  <Edit3 size={12} className="inline mr-1" /> Edit
                </button>
                {listing.status !== 'sold' && (
                  <button
                    onClick={() => handleTogglePause(listing)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[32px]"
                    style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
                  >
                    {listing.status === 'active' ? <PauseCircle size={12} className="inline mr-1" /> : <PlayCircle size={12} className="inline mr-1" />}
                    {listing.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                )}
                {listing.status !== 'sold' && (
                  <button
                    onClick={() => setDeleteId(listing.id)}
                    className="p-1.5 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                    style={{ color: '#C8102E' }}
                    title="Delete listing"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#E0E0E0' }}>
        <h3 className="font-heading text-sm font-bold uppercase mb-3" style={{ color: '#003BFF' }}><MapPin size={14} className="inline" /> LISTING TIPS</h3>
        <ul className="space-y-1.5 text-sm" style={{ color: '#374151' }}>
          <li> Active listings appear on the Browse page and are visible to all buyers.</li>
          <li> Paused listings are hidden from buyers but not deleted — useful if you need a break.</li>
          <li> Once an account is sold, the listing is automatically marked as Sold.</li>
          <li> You can only delete listings that have no ongoing orders.</li>
          <li> Add up to 5 photos — listings with photos sell 3× faster.</li>
        </ul>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} style={{ color: '#C8102E' }} />
              <h3 className="font-heading text-lg font-bold" style={{ color: '#111' }}>Delete Listing?</h3>
            </div>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>This will remove the listing from the marketplace. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#D1D5DB', color: '#374151' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: '#C8102E' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
