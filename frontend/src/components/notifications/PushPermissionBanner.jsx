import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import usePushNotifications from '../../hooks/usePushNotifications';
import { PUSH_ASKED_KEY, shouldShowPushPrompt } from '../../utils/push';

/**
 * Non-intrusive "enable notifications" banner.
 *
 * Shown once per browser for signed-in users whose permission is still
 * undecided. The browser prompt is only requested from the explicit button
 * click, never on load.
 */
export default function PushPermissionBanner() {
  const { currentUser } = useAuth();
  const { supported, permission, subscribe, busy } = usePushNotifications();
  // Read localStorage once during the first render, so users who already
  // dismissed the prompt never see a flash of the banner.
  const [asked, setAsked] = useState(() => {
    try {
      return localStorage.getItem(PUSH_ASKED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [hidden, setHidden] = useState(false);

  const visible =
    !hidden &&
    shouldShowPushPrompt({
      supported,
      permission,
      signedIn: Boolean(currentUser),
      asked,
    });

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(PUSH_ASKED_KEY, 'true');
    } catch {
      // Private mode / storage disabled — just hide it for this session.
    }
    setAsked(true);
    setHidden(true);
  };

  const handleEnable = async () => {
    try {
      const result = await subscribe();
      if (result?.ok) {
        try {
          localStorage.setItem(PUSH_ASKED_KEY, 'true');
        } catch {
          /* ignore */
        }
        setHidden(true);
        toast.success('Notifications enabled');
        return;
      }
      dismiss();
      toast('Notifications were not enabled. You can allow them later in your browser settings.');
    } catch (err) {
      toast.error(err?.message || 'Could not enable notifications');
    }
  };

  return (
    <div className="fixed left-0 right-0 bottom-16 md:bottom-0 z-40 bg-[#001E7A] border-t border-white/10 px-4 py-3 animate-fade-in">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <Bell size={16} className="text-[#FFF100] shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-0 text-xs sm:text-sm text-white/80">
          Get notified when your orders update
        </p>
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-wide transition-colors active:scale-[0.97] disabled:opacity-60"
          style={{ background: '#FFF100', color: '#111111' }}
        >
          {busy ? 'Enabling' : 'Enable Notifications'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notifications prompt"
          className="shrink-0 p-1 text-white/50 hover:text-white transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
