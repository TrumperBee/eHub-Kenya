import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../utils/constants';
import {
  isPushSupported,
  serializePushSubscription,
  urlBase64ToUint8Array,
} from '../utils/push';

const ENV_VAPID_PUBLIC_KEY = import.meta.env?.VITE_VAPID_PUBLIC_KEY || '';
const SW_URL = '/sw.js';

/**
 * Web Push subscription lifecycle for the signed-in user.
 *
 * The service worker is registered as soon as a user is signed in, but the
 * permission prompt is NEVER shown automatically — the UI calls subscribe()
 * from an explicit "Enable Notifications" click (browsers ignore prompts that
 * are not tied to a user gesture anyway).
 */
export default function usePushNotifications() {
  const { currentUser } = useAuth();
  // Read once at mount: the browser's push capability and permission never
  // change without a user action, so there is no effect to synchronise.
  const [supported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [busy, setBusy] = useState(false);
  const registrationRef = useRef(null);

  const ensureRegistration = useCallback(async () => {
    if (registrationRef.current) return registrationRef.current;
    const registration = await navigator.serviceWorker.register(SW_URL);
    registrationRef.current = registration;
    return registration;
  }, []);

  const authHeader = useCallback(async () => {
    const token = await currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [currentUser]);

  // The VAPID public key lives on the server, so a production build works
  // without VITE_VAPID_PUBLIC_KEY. The env value stays as a local override.
  const resolveVapidPublicKey = useCallback(async () => {
    if (ENV_VAPID_PUBLIC_KEY) return ENV_VAPID_PUBLIC_KEY;
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/push/public-key`);
      const key = typeof data?.publicKey === 'string' ? data.publicKey.trim() : '';
      if (key) return key;
    } catch (err) {
      console.warn('Push public key lookup failed:', err?.message || err);
    }
    throw new Error('Notifications are not set up on this site yet. Please try again later.');
  }, []);

  const postSubscription = useCallback(
    async (subscription) => {
      const payload = serializePushSubscription(subscription);
      if (!payload) throw new Error('This browser returned an invalid push subscription');
      await axios.post(
        `${BACKEND_URL}/api/push/subscribe`,
        { subscription: payload },
        { headers: await authHeader() }
      );
    },
    [authHeader]
  );

  // Register the worker and re-sync any subscription the browser already has
  // (new device sign-in, reinstall, or a backend that lost the document).
  useEffect(() => {
    if (!currentUser || !supported) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const registration = await ensureRegistration();
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        const existing = await registration.pushManager.getSubscription();
        if (existing && !cancelled) await postSubscription(existing);
      } catch (err) {
        // A service worker failure must never affect the app shell.
        console.warn('Push setup skipped:', err?.message || err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, supported, ensureRegistration, postSubscription]);

  const subscribe = useCallback(async () => {
    if (!currentUser) throw new Error('Sign in to enable notifications');
    if (!isPushSupported()) throw new Error('This browser does not support notifications');

    // Resolve the key BEFORE asking for permission: a site with no keys must
    // not burn the browser's one-shot permission prompt.
    const vapidPublicKey = await resolveVapidPublicKey();

    setBusy(true);
    try {
      const result =
        typeof Notification.requestPermission === 'function'
          ? await Notification.requestPermission()
          : 'denied';
      setPermission(result);
      if (result !== 'granted') return { ok: false, reason: result };

      const registration = await ensureRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      await postSubscription(subscription);
      return { ok: true };
    } finally {
      setBusy(false);
    }
  }, [currentUser, ensureRegistration, postSubscription, resolveVapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (!isPushSupported()) return { ok: false };
    if (!currentUser) return { ok: false };

    setBusy(true);
    try {
      const registration = await ensureRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return { ok: true, removed: false };

      const endpoint = subscription.endpoint;
      try {
        await axios.delete(`${BACKEND_URL}/api/push/subscribe`, {
          data: { endpoint },
          headers: await authHeader(),
        });
      } catch (err) {
        // Still unsubscribe locally — the browser is the source of truth and the
        // backend prunes dead endpoints on the next send.
        console.warn('Push unsubscribe request failed:', err?.message || err);
      }

      await subscription.unsubscribe();
      return { ok: true, removed: true };
    } finally {
      setBusy(false);
    }
  }, [currentUser, ensureRegistration, authHeader]);

  return { supported, permission, subscribe, unsubscribe, busy };
}
