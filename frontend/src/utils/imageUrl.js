// Image URL helpers for the marketplace.
//
// Two problems are solved here:
//   1. Cloudinary serves the full-size upload by default. Listing photos are
//      often 3-8 MB screenshots, which is why squad cards felt slow. Asking for
//      a delivery transform (f_auto, q_auto, width-capped) makes the browser
//      download a fraction of that with no visible quality loss at card size.
//   2. Older uploads may point at the Cloudflare R2 S3 endpoint (private, and
//      signed URLs expire). When VITE_R2_PUBLIC_URL is configured, those are
//      rewritten to the public bucket origin. A signed URL that cannot be
//      rewritten is reported once so the bad data can be cleaned up.
//
// Everything is best-effort: an unrecognised URL is returned unchanged.

const R2_HOST_SUFFIX = '.r2.cloudflarestorage.com';
const SIGNED_QUERY = /(^|[?&])(X-Amz-Signature|X-Amz-Credential|X-Amz-Date|Signature|Expires)=/i;

const PUBLIC_R2_BASE = String(import.meta.env?.VITE_R2_PUBLIC_URL || '').replace(/\/+$/, '');

const warned = new Set();

const warnOnce = (message) => {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
};

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

/**
 * Insert a Cloudinary delivery transform when the URL has none yet.
 * `/image/upload/v123/file.jpg` -> `/image/upload/f_auto,q_auto,c_limit,w_800/v123/file.jpg`
 */
export function optimizeCloudinaryUrl(url, width = 800) {
  const parts = url.pathname.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return url;

  const next = parts[uploadIndex + 1] || '';
  // A segment containing commas is already a transform chain; leave it alone.
  if (next.includes(',')) return url;

  const w = Math.max(64, Math.round(Number(width) || 800));
  parts.splice(uploadIndex + 1, 0, `f_auto,q_auto,c_limit,w_${w}`);
  url.pathname = parts.join('/');
  return url;
}

/**
 * Turn an R2 S3-API URL into the public bucket URL, if a public base is known.
 * Returns null when the URL cannot be made public.
 */
export function publicR2Url(url) {
  const keyParts = url.pathname.split('/').filter(Boolean); // [bucket, ...key]
  if (keyParts.length < 2) return null;
  if (!PUBLIC_R2_BASE) return null;
  const key = keyParts.slice(1).join('/');
  return `${PUBLIC_R2_BASE}/${key}`;
}

/**
 * Normalise an image URL for rendering.
 *
 * @param {string} raw
 * @param {{ width?: number }} [options]
 * @returns {string|null} usable URL, or null when there is nothing to show
 */
export function resolveImageUrl(raw, { width = 800 } = {}) {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;

  // Relative paths (bundled assets) are already fine.
  if (!isAbsoluteUrl(text)) return text;

  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }

  if (url.hostname.endsWith('cloudinary.com')) {
    return optimizeCloudinaryUrl(url, width).toString();
  }

  if (url.hostname.endsWith(R2_HOST_SUFFIX)) {
    const publicUrl = publicR2Url(url);
    if (publicUrl) return publicUrl;

    if (SIGNED_QUERY.test(url.search)) {
      warnOnce(
        '[images] A listing photo points at a signed R2 URL that will expire. Re-upload it to the public bucket.'
      );
    } else {
      warnOnce(
        '[images] A listing photo points at the private R2 S3 endpoint. Set VITE_R2_PUBLIC_URL to render it.'
      );
    }
    return url.toString();
  }

  return url.toString();
}

/** True when the URL is a signed/expiring storage link (never cache these). */
export const isSignedStorageUrl = (raw) => {
  if (typeof raw !== 'string') return false;
  try {
    return SIGNED_QUERY.test(new URL(raw).search);
  } catch {
    return false;
  }
};
