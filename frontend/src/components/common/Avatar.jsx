import { useState } from 'react';
import { resolveImageUrl } from '../../utils/imageUrl';

/**
 * Circular user avatar.
 *
 * Shows the uploaded/Google photo when there is a usable URL, and falls back to
 * initials only when the user has no photo OR the image fails to load. Tracking
 * the failed URL (instead of a boolean) means a new photo retries automatically
 * without an effect or a remount.
 */
export default function Avatar({
  src,
  name = 'User',
  size = 36,
  background = '#001E7A',
  className = '',
  textClassName = 'text-xs',
  loading = 'lazy',
  style,
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const url = resolveImageUrl(src, { width: Math.max(64, size * 2) });
  const showImage = Boolean(url) && failedSrc !== url;
  const dimension = Number(size) || 36;

  const initials =
    String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <div
      className={`relative overflow-hidden rounded-full shrink-0 ${className}`}
      style={{ width: dimension, height: dimension, background, ...style }}
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          loading={loading}
          decoding="async"
          onError={() => setFailedSrc(url)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center font-heading font-bold text-white ${textClassName}`}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
    </div>
  );
}
