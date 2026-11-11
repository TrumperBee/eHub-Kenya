import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllUsers } from '../../../services/usersService';
import { ADMIN_EMAIL } from '../../../utils/constants';
import { formatDate } from '../../../utils/formatters';
import { Download, Loader2, RefreshCw, Search, Users } from 'lucide-react';

const csvCell = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const dateOnly = (timestamp) => {
  if (!timestamp) return '';
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const roleOf = (user) => {
  if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return 'admin';
  return user.role || 'buyer';
};

function RoleBadge({ role }) {
  const styles = {
    admin: { background: '#EEF2FF', color: '#3730A3' },
    seller: { background: '#ECFDF5', color: '#047857' },
    buyer: { background: '#F3F4F6', color: '#374151' },
  };
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
      style={styles[role] || styles.buyer}
    >
      {role}
    </span>
  );
}

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    try {
      const rows = await getAllUsers();
      setUsers(rows);
    } catch (err) {
      console.error('Users load error:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function loadUsers() {
      try {
        const rows = await getAllUsers();
        if (active) setUsers(rows);
      } catch (err) {
        console.error('Users load error:', err);
        if (active) toast.error('Failed to load users');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadUsers();
    return () => {
      active = false;
    };
  }, []);

  const refresh = () => {
    setLoading(true);
    fetchUsers();
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.displayName, user.username, user.email, user.phoneNumber]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term))
    );
  }, [users, search]);

  const exportCsv = () => {
    if (users.length === 0) {
      toast.error('There are no users to export');
      return;
    }

    const headers = [
      'Display Name',
      'Username',
      'Email',
      'Phone Number',
      'Role',
      'Seller Approved',
      'Total Sales',
      'Total Purchases',
      'Joined Date',
    ];

    const rows = users.map((user) => {
      const role = roleOf(user);
      return [
        user.displayName || '',
        user.username ? `@${user.username}` : '',
        user.email || '',
        user.phoneNumber || '',
        role,
        user.sellerApproved ? 'yes' : 'no',
        Number(user.totalSales) || 0,
        Number(user.totalPurchases) || 0,
        dateOnly(user.createdAt),
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ehub-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${users.length} users.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#EEF2FF', color: '#3730A3' }}
          >
            <Users size={17} />
          </span>
          <div>
            <p className="font-heading text-sm font-bold text-konami-text">
              {users.length} registered {users.length === 1 ? 'user' : 'users'}
            </p>
            <p className="text-xs text-konami-text-muted">
              Buyers, sellers and admins from the users collection.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh users"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-konami-mid-gray text-konami-text-dim hover:text-konami-text transition-colors disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={exportCsv}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-heading font-bold uppercase tracking-wide text-white transition-colors disabled:opacity-60"
            style={{ background: '#003BFF' }}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-konami-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, username, email or phone"
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-konami-mid-gray rounded-xl text-sm text-konami-text outline-none focus:border-konami-blue transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div
            className="w-8 h-8 border-2 border-transparent border-t-konami-blue rounded-full animate-spin"
            style={{ borderRightColor: '#003BFF' }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-konami-mid-gray rounded-xl text-center py-12">
          <Users size={36} className="mx-auto mb-3 text-konami-text-muted" />
          <p className="text-sm text-konami-text-muted">
            {users.length === 0 ? 'No users yet.' : 'No users match your search.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-konami-mid-gray rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="bg-konami-light-gray text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Display Name</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Username</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Email</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap">Phone Number</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Role</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap">Seller Approved</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted text-right">Total Sales</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted text-right whitespace-nowrap">Total Purchases</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-konami-mid-gray">
                {filtered.map((user) => {
                  const role = roleOf(user);
                  return (
                    <tr key={user.uid} className="hover:bg-konami-light-gray/60 transition-colors">
                      <td className="px-4 py-3 text-konami-text">{user.displayName || '-'}</td>
                      <td className="px-4 py-3 text-konami-text-dim">
                        {user.username ? `@${user.username}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-konami-text-dim break-all">{user.email || '-'}</td>
                      <td className="px-4 py-3 text-konami-text-dim whitespace-nowrap">{user.phoneNumber || '-'}</td>
                      <td className="px-4 py-3"><RoleBadge role={role} /></td>
                      <td className="px-4 py-3">
                        {user.sellerApproved ? (
                          <span className="text-xs font-semibold text-green-600">Yes</span>
                        ) : (
                          <span className="text-xs text-konami-text-muted">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-konami-text">{Number(user.totalSales) || 0}</td>
                      <td className="px-4 py-3 text-right text-konami-text">{Number(user.totalPurchases) || 0}</td>
                      <td className="px-4 py-3 text-konami-text-dim whitespace-nowrap">{formatDate(user.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-konami-text-muted flex items-center gap-1.5">
        <Loader2 size={11} /> The CSV includes every user, not just the rows matching your search.
      </p>
    </div>
  );
}
