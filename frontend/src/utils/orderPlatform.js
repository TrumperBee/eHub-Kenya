export const resolveOrderPlatform = ({ dropPlatform, listingPlatform }) =>
  dropPlatform ?? listingPlatform ?? null;