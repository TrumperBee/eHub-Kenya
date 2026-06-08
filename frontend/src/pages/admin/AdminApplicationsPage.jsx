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
      <h2 className="font-heading text-xl font-bold text-white mb-6">Seller Applications</h2>

      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[#BF0021] text-white'
                : 'bg-[#1A1A1A] text-[#9E9E9E] hover:text-white border border-[#2A2A2A]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[#5C5C5C] text-sm">No applications found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Name</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Email</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Seller Name</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Bio</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">WhatsApp</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Date</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Status</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-[#242424] transition-colors">
                  <td className="py-3 text-sm text-white">{app.displayName || '—'}</td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{app.email}</td>
                  <td className="py-3 text-sm text-white">{app.desiredSellerName || '—'}</td>
                  <td className="py-3 text-sm text-[#9E9E9E] max-w-[200px] truncate">{app.bio || '—'}</td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{app.whatsappNumber || '—'}</td>
                  <td className="py-3 text-sm text-[#9E9E9E]">{formatDate(app.submittedAt)}</td>
                  <td className="py-3">
                    <span className={`text-xs flex items-center gap-1 ${
                      app.status === 'pending' ? 'text-amber-400' :
                      app.status === 'approved' ? 'text-green-400' : 'text-red-400'
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
                              className="w-28 px-2 py-1 text-xs bg-[#242424] border border-[#2A2A2A] rounded text-white outline-none"
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
                      <span className="text-xs text-[#5C5C5C]">Reason: {app.rejectionReason}</span>
                    ) : (
                      <span className="text-xs text-[#5C5C5C]">—</span>
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
