/* eHub Market Web Push service worker.
 *
 * Kept dependency-free: Vite copies public/ to the site root, so this file is
 * served at /sw.js.
 *
 *   push              -> show a notification with the backend payload
 *   notificationclick -> focus an open tab on that URL, or open a new one
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      // Some senders deliver plain text; never let parsing drop the alert.
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'eHub Market';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo.png',
    badge: '/logo.png',
    data: { url: payload.url || '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const path = (event.notification.data && event.notification.data.url) || '/';
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })()
  );
});
