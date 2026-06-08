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
      <h2 className="font-heading text-xl font-bold text-konami-text mb-6">All Users</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-konami-mid-gray text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Name</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Email</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Role</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Seller Approved</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Purchases</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Sales</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-konami-mid-gray">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-konami-light-gray transition-colors">
                  <td className="py-3 text-sm text-konami-text">{user.displayName || '—'}</td>
                  <td className="py-3 text-sm text-konami-text-dim">{user.email}</td>
                  <td className="py-3">
                    <span className={`text-xs ${user.role === 'seller' ? 'text-green-500' : 'text-konami-text-dim'}`}>
                      {(user.role || 'buyer').charAt(0).toUpperCase() + (user.role || 'buyer').slice(1)}
                    </span>
                  </td>
                  <td className="py-3">
                    {user.sellerApproved ? (
                      <span className="text-xs text-green-500">Yes</span>
                    ) : (
                      <span className="text-xs text-konami-text-muted">No</span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-konami-text">{user.totalPurchases || 0}</td>
                  <td className="py-3 text-sm text-konami-text">{user.totalSales || 0}</td>
                  <td className="py-3 text-sm text-konami-text-dim">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
