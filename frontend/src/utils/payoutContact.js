// Pure helpers for the admin payout cards. Keeping the display/formatting
// logic DOM-free makes the M-Pesa and WhatsApp behaviour easy to test.

import { encodeWhatsAppText, normalizeWhatsAppNumber } from './whatsapp.js';

/** Name shown to the admin, falling back to the seller's @username. */
export const sellerDisplayNameOf = (order, profile) =>
  profile?.displayName ||
  profile?.sellerDisplayName ||
  order?.sellerDisplayName ||
  (profile?.username ? `@${profile.username}` : '') ||
  'Seller';

export const sellerUsernameOf = (profile) =>
  profile?.username ? `@${profile.username}` : '';

/** The number money actually goes to (M-Pesa first, WhatsApp as fallback). */
export const payoutPhoneOf = (order, profile) =>
  profile?.phoneNumber ||
  profile?.sellerPhone ||
  order?.sellerPhone ||
  profile?.sellerWhatsapp ||
  order?.sellerWhatsapp ||
  '';

/** Prefer the published WhatsApp number for chat, then the payout number. */
export const sellerChatPhoneOf = (order, profile) =>
  profile?.sellerWhatsapp || order?.sellerWhatsapp || payoutPhoneOf(order, profile);

/**
 * 0712345678 / +254712345678 / 712345678 -> "0712 345 678".
 * Unrecognised formats are left untouched rather than rendered incorrectly.
 */
export function formatMpesaNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  let local = digits;
  if (local.length === 12 && local.startsWith('254')) local = `0${local.slice(3)}`;
  else if (local.length === 9 && /^[17]/.test(local)) local = `0${local}`;

  if (local.length === 10 && local.startsWith('0')) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return raw;
}

/** Admin -> seller WhatsApp link with a payout confirmation opener. */
export const buildAdminSellerChatUrl = ({ phone, orderId } = {}) => {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return null;
  const order = String(orderId || '').trim() || 'your order';
  const text =
    `Hi, I'm admin from eHub Market. I've sent your payout for order ${order}. ` +
    'Please confirm receipt.';
  return `https://wa.me/${number}?text=${encodeWhatsAppText(text)}`;
};
