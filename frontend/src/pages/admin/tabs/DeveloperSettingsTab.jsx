import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AlertTriangle, Loader2, Power, Save, Settings2 } from 'lucide-react';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../context/AuthContext';
import { BACKEND_URL } from '../../../utils/constants';
import { DEFAULT_MAINTENANCE_MESSAGE, normalizeMaintenanceDoc, resolveMaintenanceMessage } from '../../../utils/maintenance';
import { formatRelativeTime } from '../../../utils/formatters';

const MAX_MESSAGE_LENGTH = 500;

function StatusPill({ loading, enabled }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-konami-light-gray px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">
        <Loader2 size={12} className="animate-spin" />
        Checking
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
      style={enabled ? { background: '#FEF2F2', color: '#B91C1C' } : { background: '#F0FDF4', color: '#047857' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: enabled ? '#C8102E' : '#16A34A' }}
        aria-hidden="true"
      />
      {enabled ? 'ON' : 'OFF'}
    </span>
  );
}

export default function DeveloperSettingsTab() {
  const { currentUser } = useAuth();
  const [live, setLive] = useState({ loading: true, enabled: false, message: '', updatedAt: null });
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  // The same settings/maintenanceMode document the storefront watches, so the
  // status pill always reflects what visitors are actually seeing.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'maintenanceMode'),
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        const state = normalizeMaintenanceDoc(data);
        setLive({ loading: false, ...state, updatedAt: (data && data.updatedAt) || null });
        setDraft((prev) => prev || { enabled: state.enabled, message: state.message });
      },
      (err) => {
        console.error('Maintenance settings subscription error:', err?.code || err);
        setLive({ loading: false, enabled: false, message: '', updatedAt: null });
        setDraft((prev) => prev || { enabled: false, message: '' });
      }
    );
    return unsub;
  }, []);

  const dirty = Boolean(
    draft && (draft.enabled !== live.enabled || draft.message.trim() !== live.message.trim())
  );

  const handleSave = async () => {
    if (!draft || !currentUser || saving) return;
    const enabled = draft.enabled;
    const message = draft.message.trim().slice(0, MAX_MESSAGE_LENGTH);
    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.post(
        `${BACKEND_URL}/api/settings/maintenance`,
        { enabled, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDraft({ enabled, message });
      toast.success(
        enabled
          ? 'Maintenance mode is ON. Visitors now see the maintenance page; this dashboard stays available.'
          : 'Maintenance mode is OFF. The marketplace is live again.'
      );
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not save maintenance settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-konami-mid-gray rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-heading text-base font-bold text-konami-text">
              <Settings2 size={17} className="text-konami-blue" aria-hidden="true" />
              Developer Settings
            </h3>
            <p className="mt-1 text-xs text-konami-text-muted">
              Platform switches. Changes apply to every visitor as soon as you save.
            </p>
          </div>
          <StatusPill loading={live.loading} enabled={live.enabled} />
        </div>

        <div className="mt-6 border-t border-konami-mid-gray pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-konami-text">
                <Power size={15} aria-hidden="true" />
                Maintenance Mode
              </p>
              <p className="mt-1 text-xs text-konami-text-muted">
                Hides the storefront behind a fullscreen notice. Only the admin dashboard stays reachable.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(draft && draft.enabled)}
              aria-label="Maintenance Mode"
              onClick={() => setDraft((prev) => (prev ? { ...prev, enabled: !prev.enabled } : prev))}
              disabled={!draft || saving}
              className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50"
              style={{ background: draft && draft.enabled ? '#C8102E' : '#16A34A' }}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  draft && draft.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {draft && draft.enabled !== live.enabled && (
            <div
              className="mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs"
              style={
                draft.enabled
                  ? { borderColor: 'rgba(200,16,46,0.3)', background: '#FEF2F2', color: '#B91C1C' }
                  : { borderColor: 'rgba(22,163,74,0.3)', background: '#F0FDF4', color: '#047857' }
              }
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {draft.enabled
                  ? 'Saving with this ON hides the entire storefront for every visitor until you turn it back off. This dashboard stays available.'
                  : 'Saving with this OFF brings the marketplace back for every visitor immediately.'}
              </span>
            </div>
          )}

          <label
            htmlFor="maintenance-message"
            className="mt-5 block text-[11px] font-bold uppercase tracking-wider text-konami-text-muted"
          >
            Maintenance message (optional)
          </label>
          <textarea
            id="maintenance-message"
            rows={3}
            maxLength={MAX_MESSAGE_LENGTH}
            value={(draft && draft.message) || ''}
            onChange={(event) =>
              setDraft((prev) => (prev ? { ...prev, message: event.target.value } : prev))
            }
            disabled={!draft || saving}
            placeholder={DEFAULT_MAINTENANCE_MESSAGE}
            className="mt-2 w-full resize-none rounded-xl border border-konami-mid-gray px-3 py-2.5 text-sm text-konami-text outline-none transition-colors focus:border-konami-blue disabled:bg-konami-light-gray"
          />
          <p className="mt-1 text-[11px] text-konami-text-muted">
            Leave blank to use the default message. {(draft && draft.message.length) || 0}/{MAX_MESSAGE_LENGTH}
          </p>

          <div className="mt-3 rounded-xl bg-[#001450] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Preview</p>
            <p className="mt-1 text-sm leading-relaxed text-white/80">
              {resolveMaintenanceMessage(draft && draft.message)}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft || saving || !dirty}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-heading text-sm font-bold uppercase tracking-wide transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: '#FFF100', color: '#111111' }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving' : 'Save'}
            </button>

            {dirty && (
              <button
                type="button"
                onClick={() => setDraft({ enabled: live.enabled, message: live.message })}
                disabled={saving}
                className="text-xs font-semibold text-konami-text-muted underline-offset-2 hover:text-konami-text hover:underline disabled:opacity-50"
              >
                Discard changes
              </button>
            )}

            {dirty ? (
              <span className="text-xs font-semibold text-konami-text-muted">Unsaved changes</span>
            ) : (
              live.updatedAt && (
                <span className="text-xs text-konami-text-muted">
                  Last updated {formatRelativeTime(live.updatedAt)}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-konami-text-muted">
        Turning maintenance mode off: this page stays reachable at{' '}
        <span className="font-semibold text-konami-text">/hub-command-af29x</span> even while the
        storefront is hidden. Toggle the switch to OFF and click Save.
      </p>
    </div>
  );
}
