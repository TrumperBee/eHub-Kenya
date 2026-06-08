import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getAllUsers } from '../../services/usersService';
import { formatDate } from '../../utils/formatters';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h2 className="font-heading text-xl font-bold text-white mb-6">All Users</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Name</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Email</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Role</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Seller Approved</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Purchases</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Sales</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-[#242424] transition-colors">
                  <td className="py-3 text-sm text-white">{user.displayName || '—'}</td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{user.email}</td>
                  <td className="py-3">
                    <span className={`text-xs ${user.role === 'seller' ? 'text-green-400' : 'text-[#9E9E9E]'}`}>
                      {(user.role || 'buyer').charAt(0).toUpperCase() + (user.role || 'buyer').slice(1)}
                    </span>
                  </td>
                  <td className="py-3">
                    {user.sellerApproved ? (
                      <span className="text-xs text-green-400">Yes</span>
                    ) : (
                      <span className="text-xs text-[#5C5C5C]">No</span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-white">{user.totalPurchases || 0}</td>
                  <td className="py-3 text-sm text-white">{user.totalSales || 0}</td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
