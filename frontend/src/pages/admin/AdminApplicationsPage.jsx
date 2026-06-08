import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { getAllApplications, approveSeller, rejectApplication } from '../../services/usersService';
import { formatDate } from '../../utils/formatters';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const TABS = ['all', 'pending', 'approved', 'rejected'];

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [actionId, setActionId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(null);

  useEffect(() => {
    setLoading(true);
    getAllApplications().then(setApplications).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (userId) => {
    setActionId(userId);
    try {
      await approveSeller(userId);
      toast.success('Seller approved successfully');
      setApplications(prev => prev.map(a => a.id === userId ? { ...a, status: 'approved' } : a));
    } catch {
      toast.error('Failed to approve seller');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (userId) => {
    if (!rejectReason.trim()) return;
    setActionId(userId);
    try {
      await rejectApplication(userId, rejectReason.trim());
      toast.success('Application rejected');
      setApplications(prev => prev.map(a => a.id === userId ? { ...a, status: 'rejected', rejectionReason: rejectReason.trim() } : a));
      setShowRejectInput(null);
      setRejectReason('');
    } catch {
      toast.error('Failed to reject application');
    } finally {
      setActionId(null);
    }
  };

  const filtered = activeTab === 'all' ? applications : applications.filter(a => a.status === activeTab);

  return (
    <AdminLayout>
      <h2 className="font-heading text-xl font-bold text-konami-text mb-6">Seller Applications</h2>

      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-konami-blue text-white'
                : 'bg-white text-konami-text-muted hover:text-konami-text border border-konami-mid-gray'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-konami-text-muted text-sm">No applications found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-konami-mid-gray text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Name</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Email</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Seller Name</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Bio</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">WhatsApp</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Date</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Status</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-konami-mid-gray">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-konami-light-gray transition-colors">
                  <td className="py-3 text-sm text-konami-text">{app.displayName || '—'}</td>
                  <td className="py-3 text-sm text-konami-text-dim">{app.email}</td>
                  <td className="py-3 text-sm text-konami-text">{app.desiredSellerName || '—'}</td>
                  <td className="py-3 text-sm text-konami-text-dim max-w-[200px] truncate">{app.bio || '—'}</td>
                  <td className="py-3 text-sm text-konami-text-dim">{app.whatsappNumber || '—'}</td>
                  <td className="py-3 text-sm text-konami-text-dim">{formatDate(app.submittedAt)}</td>
                  <td className="py-3">
                    <span className={`text-xs flex items-center gap-1 ${
                      app.status === 'pending' ? 'text-amber-500' :
                      app.status === 'approved' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {app.status === 'pending' ? <Clock size={12} /> : app.status === 'approved' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3">
                    {app.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(app.id)}
                          disabled={actionId === app.id}
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          Approve
                        </button>
                        {showRejectInput === app.id ? (
                          <div className="flex gap-1">
                            <input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason..."
                              className="w-28 px-2 py-1 text-xs bg-konami-light-gray border border-konami-mid-gray rounded text-konami-text outline-none"
                            />
                            <button onClick={() => handleReject(app.id)} disabled={actionId === app.id} className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                              Go
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setShowRejectInput(app.id)} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Reject
                          </button>
                        )}
                      </div>
                    ) : app.status === 'rejected' && app.rejectionReason ? (
                      <span className="text-xs text-konami-text-muted">Reason: {app.rejectionReason}</span>
                    ) : (
                      <span className="text-xs text-konami-text-muted">—</span>
                    )}
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
