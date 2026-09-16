export const ADMIN_EMAIL = 'ochiengv250@gmail.com';
export const ADMIN_ROUTE = '/hub-command-af29x';

export const TIERS = {
  bronze:    { label: 'Bronze',    color: '#CD7F32', glow: 'rgba(205,127,50,0.3)'   },
  silver:    { label: 'Silver',    color: '#C0C0C0', glow: 'rgba(192,192,192,0.3)'  },
  gold:      { label: 'Gold',      color: '#D4AF37', glow: 'rgba(212,175,55,0.4)'   },
  legendary: { label: 'Legendary', color: '#9B59B6', glow: 'rgba(155,89,182,0.5)'   },
};

export const PLATFORMS = {
  android: { label: 'Android', icon: 'smartphone' },
  ios:     { label: 'iOS',     icon: 'smartphone' },
  both:    { label: 'Both',    icon: 'smartphone' },
};

// Status labels/colors are owned by ONE file: utils/orderMachine.js (ORDER_STATES).
// Re-exporting here means every page that treats ORDER_STATUS as a label map
// reads the SAME object the machine gates — no second label truth can drift.
export { ORDER_STATUS, ORDER_STATES } from './orderMachine.js';

export const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5000';
