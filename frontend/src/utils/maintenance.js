// Maintenance-mode helpers shared by the app shell, the maintenance page and
// the super admin Developer Settings tab.
import { ADMIN_ROUTE } from './constants.js';

export const DEFAULT_MAINTENANCE_MESSAGE =
  'eHub Market is currently under maintenance. We are making improvements to serve you better.';

export const MAINTENANCE_WHATSAPP_NUMBER = '+254713079528';
export const MAINTENANCE_WHATSAPP_URL = 'https://wa.me/254713079528';

// The super admin route (and everything under it) must keep working while
// maintenance mode is on — otherwise nobody could turn it back off.
export const isMaintenanceExemptPath = (pathname) => {
  const path = String(pathname || '/');
  return path === ADMIN_ROUTE || path.startsWith(`${ADMIN_ROUTE}/`);
};

export const resolveMaintenanceMessage = (message) => {
  const text = typeof message === 'string' ? message.trim() : '';
  return text || DEFAULT_MAINTENANCE_MESSAGE;
};

// Never trust Firestore shape: anything other than a literal true is "off",
// which keeps the marketplace available if the document is missing or broken.
export const normalizeMaintenanceDoc = (data) => ({
  enabled: Boolean(data && data.enabled === true),
  message: typeof (data && data.message) === 'string' ? data.message : '',
});
