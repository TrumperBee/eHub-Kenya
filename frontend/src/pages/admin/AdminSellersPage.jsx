import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { getAllSellers, removeSeller } from '../../services/usersService';
import { formatDate } from '../../utils/formatters';

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAllSellers().then(setSellers).finally(() => setLoading(false));
  }, []);

  const handleRemove = async (uid, displayName) => {
    setActionLoading(true);
    try {
      await removeSeller(uid);
      setSellers(prev => prev.filter(s => s.uid !== uid));
      toast.success(`Removed ${displayName || 'seller'} from seller access`);
      setConfirmRemove(null);
    } catch {
      toast.error('Failed to remove seller');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <h2 className="font-heading text-xl font-bold text-white mb-6">Manage Sellers</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
        </div>
      ) : sellers.length === 0 ? (
        <p className="text-[#5C5C5C] text-sm">No approved sellers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Name</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Email</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Display Name</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Rating</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Sales</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Joined</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {sellers.map((seller) => (
                <tr key={seller.uid} className="hover:bg-[#242424] transition-colors">
                  <td className="py-3 text-sm text-white">{seller.displayName || '—'}</td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{seller.email}</td>
                  <td className="py-3 text-sm text-white">{seller.sellerDisplayName || '—'}</td>
                  <td className="py-3 text-sm text-[#D4AF37]">{seller.sellerRating ? `${seller.sellerRating} ★` : '—'}</td>
                  <td className="py-3 text-sm text-white">{seller.totalSales || 0}</td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{formatDate(seller.createdAt)}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Link to={`/hub-command-af29x/listings`} className="px-3 py-1.5 text-xs font-medium bg-[#242424] text-white rounded-lg hover:bg-[#2E2E2E] border border-[#2A2A2A] transition-colors">
                        View Listings
                      </Link>
                      {confirmRemove === seller.uid ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleRemove(seller.uid, seller.displayName)} disabled={actionLoading} className="px-2 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                            {actionLoading ? '...' : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmRemove(null)} className="px-2 py-1.5 text-xs font-medium bg-[#242424] text-white rounded-lg hover:bg-[#2E2E2E] border border-[#2A2A2A]">
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemove(seller.uid)} className="px-3 py-1.5 text-xs font-medium bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 border border-red-400/30 transition-colors">
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmRemove(null)}>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-white mb-3">Remove Seller Access</h3>
            <p className="text-sm text-[#9E9E9E] mb-4">
              This will remove this seller's access. Their existing listings will be hidden. This action can be reversed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)} className="btn-secondary flex-1 text-sm py-2.5">
                Cancel
              </button>
              <button onClick={() => handleRemove(confirmRemove, '')} disabled={actionLoading} className="btn-primary flex-1 text-sm py-2.5 bg-red-600 hover:bg-red-700">
                {actionLoading ? 'Processing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
