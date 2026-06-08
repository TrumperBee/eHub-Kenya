import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { TIERS } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';

export default function AdminListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
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

  return (
    <AdminLayout>
      <h2 className="font-heading text-xl font-bold text-white mb-6">All Listings</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm text-white outline-none">
          <option value="all">All Tiers</option>
          {Object.entries(TIERS).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm text-white outline-none">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="sold">Sold</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[#5C5C5C] text-sm">No listings found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Title</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Tier</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Seller</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Price</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Status</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Views</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Date</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {filtered.map((listing) => (
                <tr key={listing.id} className="hover:bg-[#242424] transition-colors">
                  <td className="py-3 text-sm text-white max-w-[200px] truncate">{listing.title || '—'}</td>
                  <td className="py-3 text-sm" style={{ color: TIERS[listing.tier]?.color || '#9E9E9E' }}>{TIERS[listing.tier]?.label || listing.tier}</td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{listing.sellerDisplayName || '—'}</td>
                  <td className="py-3 text-sm font-semibold text-white">{formatKES(listing.price)}</td>
                  <td className="py-3">
                    <span className={`text-xs ${
                      listing.status === 'active' ? 'text-green-400' :
                      listing.status === 'sold' ? 'text-[#BF0021]' :
                      listing.status === 'paused' ? 'text-amber-400' : 'text-[#5C5C5C]'
                    }`}>{listing.status}</span>
                  </td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{listing.viewCount || 0}</td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{formatDate(listing.createdAt)}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleFeature(listing.id, listing.featured)} className={`px-2 py-1 text-xs rounded-lg transition-colors ${listing.featured ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-[#242424] text-[#9E9E9E] border border-[#2A2A2A] hover:text-white'}`}>
                        {listing.featured ? 'Featured' : 'Feature'}
                      </button>
                      <a href={`/listing/${listing.id}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs bg-[#242424] text-[#9E9E9E] rounded-lg border border-[#2A2A2A] hover:text-white transition-colors">
                        View
                      </a>
                      <button onClick={() => handleRemove(listing.id)} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded-lg border border-red-400/30 hover:bg-red-600/30 transition-colors">
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
    </AdminLayout>
  );
}
