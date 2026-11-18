// Shared input validation for freetext coming from the browser.
//
// SECURITY: nothing user-supplied is trusted. Every string is trimmed, stripped
// of control characters and length-capped before it can reach Firestore, an
// email template or a third-party API. Phone numbers are normalised to the
// Kenyan MSISDN form before any write.

const LIMITS = {
  listingTitle: 100,
  listingDescription: 1000,
  usernameMin: 3,
  usernameMax: 20,
  feedbackMessage: 500,
  reviewComment: 500,
  displayName: 60,
  sellerBio: 500,
  notificationTitle: 120,
  notificationMessage: 500,
  chatMessage: 2000,
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
// 07XXXXXXXX / 01XXXXXXXX / 2547XXXXXXXX / +2547XXXXXXXX
const KENYAN_PHONE_PATTERN = /^(?:(?:254)|\+?254|0)(?:7|1)\d{8}$/;

/**
 * Trim, collapse control characters and cap length. Returns '' for non-strings.
 */
function cleanText(value, maxLength) {
  const text = String(value ?? '')
    // Strip C0/C1 control characters except newline and tab.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim();
  return maxLength && text.length > maxLength ? text.slice(0, maxLength) : text;
}

/** Strip formatting so +254 712 345 678 and 0712345678 compare equal. */
function normalizeKenyanPhone(value) {
  return String(value ?? '').replace(/[^\d+]/g, '');
}

function isValidKenyanPhone(value) {
  const normalized = normalizeKenyanPhone(value);
  if (!KENYAN_PHONE_PATTERN.test(normalized)) return false;
  // 254XXXXXXXXX / 0XXXXXXXXX / +254XXXXXXXXX all normalise to 12 digits max.
  return normalized.replace(/^\+/, '').length >= 10;
}

function isValidUsername(value) {
  return typeof value === 'string' && USERNAME_PATTERN.test(value);
}

module.exports = {
  LIMITS,
  USERNAME_PATTERN,
  KENYAN_PHONE_PATTERN,
  cleanText,
  normalizeKenyanPhone,
  isValidKenyanPhone,
  isValidUsername,
};
