import TableSkeleton from '../../components/admin/TableSkeleton';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { TIERS } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';
import { Package, Tag } from 'lucide-react';

export default function AdminListingsPage({ embedded = false }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    getDocs(query(collection(db, 'listings'), orderBy('createdAt', 'desc')))
      .then(snap => setListings(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleFeature = async (id, current) => {
    try {
      await updateDoc(doc(db, 'listings', id), { featured: !current });
      setListings(prev => prev.map(l => l.id === id ? { ...l, featured: !current } : l));
      toast.success(current ? 'Removed from featured' : 'Added to featured');
    } catch {
      toast.error('Failed to update listing');
    }
  };

  const handleRemove = async (id) => {
    try {
      await updateDoc(doc(db, 'listings', id), { status: 'removed' });
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'removed' } : l));
      toast.success('Listing removed');
    } catch {
      toast.error('Failed to remove listing');
    }
  };

  const filtered = listings.filter(l => {
    if (tierFilter !== 'all' && l.tier !== tierFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    return true;
  });

  const activeListings = listings.filter(l => l.status === 'active');
  const totalActiveValue = activeListings.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  const soldValue = listings
    .filter(l => l.status === 'sold')
    .reduce((sum, l) => sum + (Number(l.price) || 0), 0);

  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-heading text-lg font-bold text-konami-text">All Listings</h2>
          <p className="text-xs text-konami-text-muted mt-0.5">
            Every account listed on the marketplace, including sold and removed listings.
          </p>
        </div>
        <div className="rounded-xl px-4 py-2.5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#1D4ED8' }}>
            Total value listed
          </p>
          <p className="font-heading text-lg font-bold" style={{ color: '#1E3A8A' }}>
            {formatKES(totalActiveValue)}
          </p>
          <p className="text-[10px]" style={{ color: '#3B82F6' }}>
            {activeListings.length} active · {formatKES(soldValue)} sold
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-konami-mid-gray rounded-xl p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
            <Package size={16} />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-konami-text-muted">Active listings</p>
            <p className="font-heading text-lg font-bold text-konami-text">{activeListings.length}</p>
          </div>
        </div>
        <div className="bg-white border border-konami-mid-gray rounded-xl p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F3F4F6', color: '#374151' }}>
            <Tag size={16} />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-konami-text-muted">Sold value</p>
            <p className="font-heading text-lg font-bold text-konami-text">{formatKES(soldValue)}</p>
          </div>
        </div>
        <div className="bg-white border border-konami-mid-gray rounded-xl p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F3F4F6', color: '#374151' }}>
            <Package size={16} />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-konami-text-muted">All listings</p>
            <p className="font-heading text-lg font-bold text-konami-text">{listings.length}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="px-3 py-2 bg-white border border-konami-mid-gray rounded-lg text-sm text-konami-text outline-none">
          <option value="all">All Tiers</option>
          {Object.entries(TIERS).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-konami-mid-gray rounded-lg text-sm text-konami-text outline-none">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="sold">Sold</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <p className="text-konami-text-muted text-sm">No listings found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead>
              <tr className="border-b border-konami-mid-gray text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Title</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Tier</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Seller</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Price</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Status</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Views</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Date</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-konami-mid-gray">
              {filtered.map((listing) => (
                <tr key={listing.id} className="hover:bg-konami-light-gray transition-colors">
                  <td className="py-3 text-sm text-konami-text max-w-[200px] truncate">{listing.title || '-'}</td>
                  <td className="py-3 text-sm" style={{ color: TIERS[listing.tier]?.color || '#6B7280' }}>{TIERS[listing.tier]?.label || listing.tier}</td>
                  <td className="py-3 text-sm text-konami-text-dim">{listing.sellerDisplayName || '-'}</td>
                  <td className="py-3 text-sm font-semibold text-konami-text">{formatKES(listing.price)}</td>
                  <td className="py-3">
                    <span className={`text-xs ${
                      listing.status === 'active' ? 'text-green-500' :
                      listing.status === 'sold' ? 'text-konami-blue' :
                      listing.status === 'paused' ? 'text-amber-500' : 'text-konami-text-muted'
                    }`}>{listing.status}</span>
                  </td>
                  <td className="py-3 text-sm text-konami-text-dim">{listing.viewCount || 0}</td>
                  <td className="py-3 text-sm text-konami-text-dim">{formatDate(listing.createdAt)}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleFeature(listing.id, listing.featured)} className={`px-2 py-1 text-xs rounded-lg transition-colors ${listing.featured ? 'bg-amber-400/20 text-amber-500 border border-amber-400/30' : 'bg-konami-light-gray text-konami-text-dim border border-konami-mid-gray hover:text-konami-text'}`}>
                        {listing.featured ? 'Featured' : 'Feature'}
                      </button>
                      <a href={`/listing/${listing.id}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs bg-konami-light-gray text-konami-text-dim rounded-lg border border-konami-mid-gray hover:text-konami-text transition-colors">
                        View
                      </a>
                      <button onClick={() => handleRemove(listing.id)} className="px-2 py-1 text-xs bg-red-600/20 text-red-500 rounded-lg border border-red-400/30 hover:bg-red-600/30 transition-colors">
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return embedded ? content : <AdminLayout>{content}</AdminLayout>;
}
