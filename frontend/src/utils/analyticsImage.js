// Pure helpers for the square analytics image export. Kept DOM-free so the
// layout maths and file naming can be tested with node's built-in runner.

export const ANALYTICS_IMAGE_SIZE = 1080;
export const ANALYTICS_FOOTER_HEIGHT = 120;

const pad = (value) => String(value).padStart(2, '0');

/** Local YYYY-MM-DD (avoids the UTC off-by-one in toISOString()). */
export function analyticsDateStamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function analyticsImageFileName(date = new Date()) {
  return `ehubmarket-stats-${analyticsDateStamp(date)}.png`;
}

export function analyticsFooterDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Fit the captured report into the square content area above the footer.
 * Returns a centred destination rectangle for canvas.drawImage().
 */
export function analyticsImageLayout(
  sourceWidth,
  sourceHeight,
  size = ANALYTICS_IMAGE_SIZE,
  footerHeight = ANALYTICS_FOOTER_HEIGHT,
  padding = 32
) {
  const width = Number(sourceWidth) > 0 ? Number(sourceWidth) : 1;
  const height = Number(sourceHeight) > 0 ? Number(sourceHeight) : 1;
  const boxWidth = size - padding * 2;
  const boxHeight = size - footerHeight - padding * 2;
  const scale = Math.min(boxWidth / width, boxHeight / height);
  const drawWidth = Math.max(1, Math.round(width * scale));
  const drawHeight = Math.max(1, Math.round(height * scale));

  return {
    x: Math.round((size - drawWidth) / 2),
    y: Math.round(padding + (boxHeight - drawHeight) / 2),
    width: drawWidth,
    height: drawHeight,
  };
}
