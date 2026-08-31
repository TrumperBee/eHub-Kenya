export const MIN_DROP_DISCOUNT_PERCENT = 5;

export function validateDropPrice(regularPrice, dropPrice) {
  const regular = Number(regularPrice) || 0;
  const drop = Number(dropPrice) || 0;
  if (drop <= 0) return 'Enter a drop price';
  if (drop >= regular) return 'Drop price must be lower than the regular price';
  if (((regular - drop) / regular) * 100 < MIN_DROP_DISCOUNT_PERCENT) {
    return `Drop must be at least ${MIN_DROP_DISCOUNT_PERCENT}% off to go live`;
  }
  return null;
}
