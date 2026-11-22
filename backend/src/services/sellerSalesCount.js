// Shared patch for the user counters updated when an order becomes completed.
// Firestore sentinels are injected so the pure patch shape stays unit-testable.

function sellerCompletedSalePatch({ increment, serverTimestamp }) {
  const bump = typeof increment === 'function' ? increment : (value) => value;
  const stamp = typeof serverTimestamp === 'function' ? serverTimestamp : () => null;

  return {
    totalSales: bump(1),
    completedSalesCount: bump(1),
    updatedAt: stamp(),
  };
}

module.exports = { sellerCompletedSalePatch };
