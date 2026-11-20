// WhatsApp deep links used by the marketplace.
//
// wa.me takes the international number WITHOUT a leading "+" and the message
// body percent-encoded. encodeURIComponent leaves apostrophes alone, so we
// escape them explicitly to keep the generated link identical to the documented
// template (e.g. "I%27m").
export const ADMIN_WHATSAPP_NUMBER = '254713079528';
export const ADMIN_WHATSAPP_URL = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}`;

export const encodeWhatsAppText = (text) =>
  encodeURIComponent(String(text || '')).replace(/'/g, '%27');

/**
 * Seller -> admin nudge after the seller submits account credentials and is
 * waiting for the buyer to verify. Includes the seller's display name and the
 * order id so the admin can act without asking which order it is.
 */
export const buildSellerPayoutAlertUrl = ({ sellerName, orderId } = {}) => {
  const name = String(sellerName || '').trim() || 'a seller';
  const order = String(orderId || '').trim() || 'my order';
  const text =
    `Hello I'm ${name} just submitted my account details ` +
    `for order ${order} waiting for buyer confirmation and payment release`;
  return `${ADMIN_WHATSAPP_URL}?text=${encodeWhatsAppText(text)}`;
};

// Direct buyer <-> seller contact is only allowed once escrow is active, so a
// deal can never be moved off-platform while the order is still unpaid.
export const DIRECT_CONTACT_STATUSES = ['awaiting_seller_delivery', 'completed', 'disputed'];

export const canShowDirectContact = (status) =>
  DIRECT_CONTACT_STATUSES.includes(String(status || ''));

/**
 * wa.me needs a full international number: digits only, no "+", no spaces,
 * no leading zero. Users store Kenyan numbers as 0712..., 712... or
 * +254712..., so the local forms are rewritten to 254712...
 * Returns '' when the value cannot be a usable phone number.
 */
export const normalizeWhatsAppNumber = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  let number = digits;

  // 0712 345 678 (10 digits) or 712 345 678 (9 digits) -> 254712345678
  if (number.length === 10 && number.startsWith('0')) number = `254${number.slice(1)}`;
  else if (number.length === 9 && /^[17]/.test(number)) number = `254${number}`;

  // Anything shorter than a local number is not a real WhatsApp target.
  if (number.length < 9) return '';
  return number;
};

// Pre-filled openers. Kept short so WhatsApp shows them cleanly on mobile.
const contactText = ({ role, orderId }) => {
  const order = String(orderId || '').trim() || 'my order';
  return role === 'seller'
    ? `Hi, I'm the seller for your eHub Market order ${order}`
    : `Hi, I'm contacting you about my eHub Market order ${order}`;
};

/**
 * Buyer -> seller. Returns null (render nothing) when the seller has not
 * published a usable WhatsApp number, per the "no broken button" rule.
 */
export const buildBuyerContactUrl = ({ sellerWhatsapp, orderId } = {}) => {
  const number = normalizeWhatsAppNumber(sellerWhatsapp);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeWhatsAppText(
    contactText({ role: 'buyer', orderId })
  )}`;
};

/** Seller -> buyer. Returns null when the buyer has no usable phone number. */
export const buildSellerContactUrl = ({ buyerPhone, orderId } = {}) => {
  const number = normalizeWhatsAppNumber(buyerPhone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeWhatsAppText(
    contactText({ role: 'seller', orderId })
  )}`;
};
