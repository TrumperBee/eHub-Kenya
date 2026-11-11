import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { getAllApplications, approveSeller, rejectApplication } from '../../services/usersService';
import { formatDate } from '../../utils/formatters';
import { CheckCircle, XCircle, Clock, Phone, MessageCircle, Mail } from 'lucide-react';

const TABS = ['all', 'pending', 'approved', 'rejected'];

const STATUS_STYLE = {
  pending: { label: 'Pending', bg: '#FEF3C7', color: '#B45309' },
  approved: { label: 'Approved', bg: '#D1FAE5', color: '#047857' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', color: '#B91C1C' },
};

const normalisePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `254${digits.slice(1)}` : digits;
};

const initialsOf = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

function StatusPill({ status }) {
  const style = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
      style={{ background: style.bg, color: style.color }}
    >
      {status === 'pending' ? <Clock size={11} /> : status === 'approved' ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {style.label}
    </span>
  );
}

export default function AdminApplicationsPage({ embedded = false }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [actionId, setActionId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(null);
  const [profiles, setProfiles] = useState({});
  const requested = useRef(new Set());

  useEffect(() => {
    getAllApplications().then(setApplications).finally(() => setLoading(false));
  }, []);

  // Applications only carry the WhatsApp number supplied at signup. Pull the
  // matching user profile so the card also shows the phone number on record.
  useEffect(() => {
    const missing = applications
      .map((app) => app.id)
      .filter((id) => id && !requested.current.has(id));
    if (missing.length === 0) return undefined;

    let active = true;
    missing.forEach((id) => requested.current.add(id));

    Promise.all(
      missing.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          return [id, snap.exists() ? snap.data() : {}];
        } catch {
          return [id, {}];
        }
      })
    ).then((entries) => {
      if (active) setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });

    return () => {
      active = false;
    };
  }, [applications]);

  const handleApprove = async (userId) => {
    setActionId(userId);
    try {
      await approveSeller(userId);
      toast.success('Seller approved successfully');
      setApplications((prev) => prev.map((a) => (a.id === userId ? { ...a, status: 'approved' } : a)));
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
      setApplications((prev) =>
        prev.map((a) =>
          a.id === userId ? { ...a, status: 'rejected', rejectionReason: rejectReason.trim() } : a
        )
      );
      setShowRejectInput(null);
      setRejectReason('');
    } catch {
      toast.error('Failed to reject application');
    } finally {
      setActionId(null);
    }
  };

  const filtered =
    activeTab === 'all' ? applications : applications.filter((a) => a.status === activeTab);

  const content = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-konami-text">Seller Applications</h2>
          <p className="text-xs text-konami-text-muted mt-0.5">
            Review each application, verify the contact details, then approve or reject.
          </p>
        </div>
        <div className="flex gap-1 bg-konami-light-gray rounded-lg p-1 flex-wrap">
          {TABS.map((tab) => {
            const count =
              tab === 'all' ? applications.length : applications.filter((a) => a.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-konami-blue shadow-sm'
                    : 'text-konami-text-muted hover:text-konami-text'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
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
          <Clock size={36} className="mx-auto mb-3 text-konami-text-muted" />
          <p className="text-sm text-konami-text-muted">No applications in this view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((app) => {
            const profile = profiles[app.id] || {};
            const whatsapp = app.whatsappNumber || profile.sellerWhatsapp || '';
            const phone = profile.phoneNumber || '';
            const waNumber = normalisePhone(whatsapp);
            const isPending = app.status === 'pending';
            const busy = actionId === app.id;

            return (
              <div
                key={app.id}
                className="bg-white border border-konami-mid-gray rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-sm shrink-0"
                      style={{ background: '#EEF2FF', color: '#3730A3' }}
                    >
                      {initialsOf(app.displayName || app.desiredSellerName)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-sm text-konami-text truncate">
                        {app.desiredSellerName || app.displayName || 'Unnamed applicant'}
                      </p>
                      <p className="text-xs text-konami-text-muted truncate">{app.displayName || '-'}</p>
                    </div>
                  </div>
                  <StatusPill status={app.status} />
                </div>

                {app.bio && (
                  <p className="text-xs text-konami-text-dim leading-relaxed line-clamp-3">{app.bio}</p>
                )}

                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-2 text-konami-text-dim min-w-0">
                    <Mail size={12} className="shrink-0 text-konami-text-muted" />
                    <span className="truncate">{app.email || '-'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-konami-text-dim">
                    <MessageCircle size={12} className="shrink-0 text-konami-text-muted" />
                    <span className="text-konami-text-muted">WhatsApp:</span>
                    {waNumber ? (
                      <a
                        href={`https://wa.me/${waNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-green-700 hover:underline"
                      >
                        {whatsapp}
                      </a>
                    ) : (
                      <span className="text-konami-text-muted">Not provided</span>
                    )}
                  </p>
                  <p className="flex items-center gap-2 text-konami-text-dim">
                    <Phone size={12} className="shrink-0 text-konami-text-muted" />
                    <span className="text-konami-text-muted">Phone:</span>
                    {phone ? (
                      <a href={`tel:${phone.replace(/\s+/g, '')}`} className="font-mono text-konami-blue hover:underline">
                        {phone}
                      </a>
                    ) : (
                      <span className="text-konami-text-muted">Not on profile</span>
                    )}
                  </p>
                </div>

                <div className="mt-auto pt-3 border-t border-konami-mid-gray flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-konami-text-muted">
                    Applied {formatDate(app.submittedAt)}
                  </span>

                  {isPending ? (
                    showRejectInput === app.id ? (
                      <div className="flex gap-1.5">
                        <input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason"
                          className="w-28 px-2 py-1.5 text-xs bg-konami-light-gray border border-konami-mid-gray rounded-lg text-konami-text outline-none focus:border-konami-blue"
                        />
                        <button
                          onClick={() => handleReject(app.id)}
                          disabled={busy || !rejectReason.trim()}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Go
                        </button>
                        <button
                          onClick={() => {
                            setShowRejectInput(null);
                            setRejectReason('');
                          }}
                          className="px-2 py-1.5 text-xs font-medium rounded-lg border border-konami-mid-gray text-konami-text-dim"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setShowRejectInput(app.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                        <button
                          onClick={() => handleApprove(app.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-50"
                          style={{ background: '#16A34A' }}
                        >
                          <CheckCircle size={12} /> {busy ? 'Approving...' : 'Approve'}
                        </button>
                      </div>
                    )
                  ) : app.status === 'rejected' && app.rejectionReason ? (
                    <span className="text-[11px] text-konami-text-muted max-w-[180px] truncate">
                      Reason: {app.rejectionReason}
                    </span>
                  ) : (
                    <span className="text-[11px] text-konami-text-muted">No action needed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return embedded ? content : <AdminLayout>{content}</AdminLayout>;
}
