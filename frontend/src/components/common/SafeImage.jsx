import { useState } from 'react';
import { Circle } from 'lucide-react';
import { resolveImageUrl } from '../../utils/imageUrl';

/**
 * Listing/squad image with a dark placeholder and a broken-image fallback.
 *
 * - The wrapper is the app's dark blue (#001450), so the card never flashes
 *   white while the photo streams in.
 * - loading="lazy" keeps off-screen squad photos out of the initial render.
 * - If the image errors, `fallback` is rendered instead of a broken-image icon.
 *
 * `failedSrc` (rather than a boolean) means changing the photo retries on its
 * own, with no effect or remount.
 */
export default function SafeImage({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  width = 800,
  loading = 'lazy',
  fallback = null,
  placeholderClassName = '',
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const [loadedSrc, setLoadedSrc] = useState(null);
  const url = resolveImageUrl(src, { width });
  const failed = Boolean(url) && failedSrc === url;
  const loaded = Boolean(url) && loadedSrc === url;

  return (
    <div
      className={`relative overflow-hidden ${wrapperClassName}`}
      style={{ backgroundColor: '#001450' }}
    >
      {url && !failed ? (
        <>
          {!loaded && (
            <div
              className={`absolute inset-0 animate-pulse ${placeholderClassName}`}
              style={{ backgroundColor: '#001450' }}
              aria-hidden="true"
            />
          )}
          <img
            src={url}
            alt={alt}
            loading={loading}
            decoding="async"
            onLoad={() => setLoadedSrc(url)}
            onError={() => setFailedSrc(url)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: '#001450' }}>
          {fallback || <Circle size={40} style={{ color: 'rgba(255,255,255,0.3)' }} />}
        </div>
      )}
    </div>
  );
}
