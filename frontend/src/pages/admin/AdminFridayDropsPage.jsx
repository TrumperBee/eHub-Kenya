import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Flame, CheckCircle, XCircle, Clock, Package, Tag, Eye } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { subscribeToAllDrops, approveDrop, rejectDrop } from '../../services/fridayDropsService';
import { formatKES, formatRelativeTime } from '../../utils/formatters';
import { getCurrentDropWeek } from '../../utils/fridayUtils';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'expired', label: 'Expired' },
  { id: 'all', label: 'All' },
];

const STATUS_STYLE = {
  pending: { label: 'PENDING', color: '#B45309', bg: '#FEF3C7' },
  approved: { label: 'APPROVED', color: '#047857', bg: '#D1FAE5' },
  rejected: { label: 'REJECTED', color: '#B91C1C', bg: '#FEE2E2' },
  expired: { label: 'EXPIRED', color: '#6B7280', bg: '#F3F4F6' },
};

export default function AdminFridayDropsPage() {
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [reasonId, setReasonId] = useState(null);
  const [reason, setReason] = useState('');
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    const unsub = subscribeToAllDrops(
      (items) => {
        setDrops(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const week = getCurrentDropWeek();
  const pending = drops.filter((d) => d.status === 'pending');
  const liveThisWeek = drops.filter((d) => d.status === 'approved' && d.year === week.year && Number(d.weekNum) === week.weekNum);
  const totalDiscountValue = liveThisWeek.reduce((sum, d) => sum + ((d.regularPrice || 0) - (d.dropPrice || 0)), 0);

  const handleApprove = async (dropId) => {
    setActionId(dropId);
    try {
      await approveDrop(dropId);
      toast.success('Drop approved. It will go live Friday 12:00 EAT');
    } catch {
      toast.error('Failed to approve drop');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (dropId) => {
    if (!reason.trim()) return;
    setActionId(dropId);
    try {
      await rejectDrop(dropId, reason.trim());
      toast.success('Drop rejected');
      setReasonId(null);
      setReason('');
    } catch {
      toast.error('Failed to reject drop');
    } finally {
      setActionId(null);
    }
  };

  const filtered = [...(activeTab === 'all' ? drops : drops.filter((d) => d.status === activeTab))];
  filtered.sort((a, b) => ((b.submittedAt?.toDate?.() || new Date(0)).getTime()) - ((a.submittedAt?.toDate?.() || new Date(0)).getTime()));

  const stats = [
    { label: 'Pending Approvals', value: pending.length, icon: <Clock size={18} />, color: '#F59E0B', badge: pending.length > 0 },
    { label: 'Live This Week', value: liveThisWeek.length, icon: <Flame size={18} />, color: '#C8102E' },
    { label: 'Total Drops', value: drops.length, icon: <Package size={18} />, color: '#3B82F6' },
    { label: 'Discount Value Live', value: formatKES(totalDiscountValue), icon: <Tag size={18} />, color: '#D4AF37' },
  ];

  return (
    <AdminLayout>
      <h2 className="font-heading text-xl font-bold text-konami-text mb-6">Friday Drops</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((card) => (
          <div key={card.label} className="bg-white border border-konami-mid-gray rounded-xl p-5" style={{ borderTopColor: card.color, borderTopWidth: 2 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-konami-text-muted uppercase tracking-wider">{card.label}</span>
              <span style={{ color: card.color }}>{card.icon}</span>
            </div>
            <p className="font-heading text-2xl font-bold text-konami-text">
              {card.value}
              {card.badge && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-konami-red text-white">{pending.length}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-konami-blue text-white'
                : 'bg-white text-konami-text-muted hover:text-konami-text border border-konami-mid-gray'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-konami-text-muted text-sm">No drops in this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-konami-mid-gray text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Account</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Seller</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Prices</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Week</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Submitted</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Status</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-konami-mid-gray">
              {filtered.map((drop) => {
                const st = STATUS_STYLE[drop.status] || STATUS_STYLE.expired;
                const isPending = drop.status === 'pending';
                return (
                  <tr key={drop.id} className="hover:bg-konami-light-gray transition-colors">
                    <td className="py-3 text-sm text-konami-text">
                      <div className="flex items-center gap-3 min-w-0">
                        {drop.photo ? (
                          <img src={drop.photo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ background: '#F0F4FF' }}><Package size={16} /></div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold truncate max-w-[200px]">{drop.title}</p>
                          <Link to={`/listing/${drop.listingId}`} className="text-xs text-konami-blue hover:underline">View listing</Link>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-konami-text-dim">{drop.sellerName || '-'}</td>
                    <td className="py-3 text-sm">
                      <span className="line-through text-konami-text-dim mr-2">{formatKES(drop.regularPrice)}</span>
                      <span className="font-bold" style={{ color: '#C8102E' }}>{formatKES(drop.dropPrice)}</span>
                      <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#B91C1C' }}>-{drop.discountPercent}%</span>
                    </td>
                    <td className="py-3 text-sm text-konami-text-dim">{drop.fridayDateISO}</td>
                    <td className="py-3 text-sm text-konami-text-dim">{formatRelativeTime(drop.submittedAt)}</td>
                    <td className="py-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td className="py-3">
                      {isPending ? (
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => handleApprove(drop.id)}
                            disabled={actionId === drop.id}
                            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          {reasonId === drop.id ? (
                            <div className="flex gap-1">
                              <input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Reason..."
                                className="w-28 px-2 py-1 text-xs bg-konami-light-gray border border-konami-mid-gray rounded text-konami-text outline-none"
                              />
                              <button
                                onClick={() => handleReject(drop.id)}
                                disabled={actionId === drop.id}
                                className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                              >
                                Go
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReasonId(drop.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          )}
                        </div>
                      ) : drop.status === 'rejected' ? (
                        <span className="text-xs text-konami-text-muted">{drop.rejectionReason || '-'}</span>
                      ) : drop.views > 0 ? (
                        <span className="text-xs text-konami-text-muted flex items-center gap-1"><Eye size={12} /> {drop.views}</span>
                      ) : (
                        <span className="text-xs text-konami-text-muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}