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
