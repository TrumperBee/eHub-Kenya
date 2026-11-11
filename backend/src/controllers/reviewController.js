const { admin, adminDb } = require('../services/firebaseAdmin');

/**
 * POST /api/reviews (auth required)
 *
 * Reviews are written with the Admin SDK because a buyer must update the
 * seller's aggregate rating, which Firestore rules correctly forbid clients
 * from doing directly. Reviews are only accepted from a buyer with a completed
 * order for that seller (verified purchase).
 *
 * Body: { orderId?, sellerId?, rating, comment }
 *  - orderId  — preferred; the completed order being reviewed
 *  - sellerId — fallback used by the seller-profile review form; the backend
 *               finds the buyer's most recent completed order with that seller
 */
async function submitReview(req, res) {
  try {
    const uid = req.user.uid;
    const { orderId, sellerId: sellerIdInput, rating, comment } = req.body || {};

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const text = String(comment || '').trim();
    if (text.length < 10 || text.length > 500) {
      return res.status(400).json({ error: 'Review must be between 10 and 500 characters' });
    }

    let order = null;

    if (orderId) {
      const snap = await adminDb.doc(`orders/${orderId}`).get();
      if (!snap.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      order = { id: orderId, ...snap.data() };
      if (order.buyerId !== uid) {
        return res.status(403).json({ error: 'You can only review your own orders' });
      }
    } else {
      const sellerId = String(sellerIdInput || '').trim();
      if (!sellerId) {
        return res.status(400).json({ error: 'sellerId or orderId is required' });
      }

      // Equality filters only — avoids requiring a custom composite index.
      const snap = await adminDb
        .collection('orders')
        .where('buyerId', '==', uid)
        .where('sellerId', '==', sellerId)
        .where('status', '==', 'completed')
        .get();

      const orders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

      order = orders[0] || null;
      if (!order) {
        return res.status(403).json({ error: 'You can review a seller only after a completed order' });
      }
    }

    if (order.status !== 'completed') {
      return res.status(403).json({ error: 'You can review a seller only after the order is completed' });
    }

    const sellerId = order.sellerId;
    const listingId = order.listingId || null;

    // Prefer the public profile values over bare token claims.
    const userSnap = await adminDb.doc(`users/${uid}`).get();
    const profile = userSnap.exists ? userSnap.data() : {};
    const emailPrefix = (req.user.email || '').split('@')[0];

    const existingSnap = await adminDb.doc(`users/${sellerId}/reviews/${uid}`).get();
    const isUpdate = existingSnap.exists;

    const reviewData = {
      buyerId: uid,
      buyerDisplayName: profile.displayName || req.user.name || emailPrefix || 'Anonymous',
      buyerUsername: profile.username || emailPrefix || 'anonymous',
      buyerPhotoURL: profile.photoURL || req.user.picture || null,
      rating: numericRating,
      comment: text,
      isVerifiedPurchase: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!isUpdate) {
      reviewData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await adminDb.doc(`users/${sellerId}/reviews/${uid}`).set(reviewData, { merge: true });

    if (listingId) {
      const listingSnap = await adminDb.doc(`listings/${listingId}`).get();
      const listingReview = { ...reviewData, listingId };
      if (listingSnap.exists) {
        listingReview.listingTitle = listingSnap.data().title || 'Account';
      }
      await adminDb.doc(`listings/${listingId}/reviews/${uid}`).set(listingReview, { merge: true });
    }

    // Recompute the seller aggregate from source-of-truth reviews.
    const reviewsSnap = await adminDb.collection('users').doc(sellerId).collection('reviews').get();
    const ratings = reviewsSnap.docs
      .map((d) => Number(d.data().rating))
      .filter((n) => n >= 1 && n <= 5);
    const total = ratings.length;
    const average = total > 0
      ? Math.round((ratings.reduce((sum, n) => sum + n, 0) / total) * 10) / 10
      : 0;

    await adminDb.doc(`users/${sellerId}`).update({
      sellerRating: average,
      sellerTotalRatings: total,
    });

    return res.json({
      success: true,
      updated: isUpdate,
      sellerRating: average,
      sellerTotalRatings: total,
    });
  } catch (err) {
    console.error('Submit review error:', err);
    return res.status(500).json({ error: 'Could not save your review. Please try again.' });
  }
}

module.exports = { submitReview };
