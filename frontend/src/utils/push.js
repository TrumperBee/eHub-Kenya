// Pure helpers for Web Push. Kept free of React so they can be unit tested.

// localStorage flag: "we already showed the enable-notifications banner".
export const PUSH_ASKED_KEY = 'pushAsked';

export const isPushSupported = (
  nav = typeof navigator !== 'undefined' ? navigator : null,
  win = typeof window !== 'undefined' ? window : null
) =>
  Boolean(
    nav &&
      win &&
      'serviceWorker' in nav &&
      'PushManager' in win &&
      'Notification' in win
  );

/**
 * VAPID keys are base64url. PushManager.subscribe wants a Uint8Array, so the
 * padding is restored and the URL-safe alphabet is mapped back to base64.
 */
export const urlBase64ToUint8Array = (base64String) => {
  const value = String(base64String || '').trim();
  if (!value) throw new Error('Missing VAPID public key');

  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

/** JSON-safe copy of a browser PushSubscription for the backend. */
export const serializePushSubscription = (subscription) => {
  if (!subscription) return null;
  const raw =
    typeof subscription.toJSON === 'function' ? subscription.toJSON() : subscription;
  if (!raw || !raw.endpoint || !raw.keys || !raw.keys.p256dh || !raw.keys.auth) return null;
  return {
    endpoint: raw.endpoint,
    expirationTime: raw.expirationTime ?? null,
    keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth },
  };
};

/**
 * The enable-notifications banner is only useful while the browser still has a
 * choice to make. Once granted or denied, or once dismissed, stay quiet.
 */
export const shouldShowPushPrompt = ({ supported, permission, signedIn, asked }) =>
  Boolean(supported && signedIn && permission === 'default' && !asked);
