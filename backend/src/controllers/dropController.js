// POST /api/drops/submit — trusted backend path for creating Friday Drop
// submissions. Computes the binding Friday in East Africa Time server-side
// (the same rules as the frontend) and emails the seller a Live or Scheduled
// notification based on the EAT day the submission happens on.
//
// Only the drop creation depends on the backend; admin approval/rejection stays
// on the client (no email required for those events), and listing status updates
// are unchanged.

const { admin, adminDb } = require('../services/firebaseAdmin');
const { getCurrentDropWeek, isFriday } = require('../utils/fridayDropScheduler');
const { sendFridayDropEmail, getUserEmail } = require('../services/emailService');

const SERIES = (arr) => (Array.isArray(arr) ? arr : []);

function calcDiscount(regularPrice, dropPrice) {
  const r = Number(regularPrice) || 0;
  const d = Number(dropPrice) || 0;
  if (r <= 0 || d <= 0 || d >= r) return 0;
  return Math.round(((r - d) / r) * 100);
}

function cleanDropData(data) {
  return {
    listingId: data.listingId || '',
    sellerId: data.sellerId || '',
    sellerName: data.sellerName || 'Unknown Seller',
    sellerPhotoURL: data.sellerPhotoURL || null,
    sellerRating: Number(data.sellerRating) || 0,
    title: data.title || 'Untitled Account',
    photo: data.photo || null,
    tier: data.tier || 'bronze',
    platform: data.platform || 'android',
    regularPrice: Number(data.regularPrice) || 0,
    dropPrice: Number(data.dropPrice) || 0,
    discountPercent: calcDiscount(data.regularPrice, data.dropPrice),
    featuredPlayers: SERIES(data.featuredPlayers).filter(Boolean).slice(0, 5),
    goldCoins: Number(data.goldCoins) || 0,
    gp: Number(data.gp) || 0,
    fiveStarCount: Number(data.fiveStarCount) || 0,
    views: 0,
  };
}

async function submitDrop(req, res) {
  try {
    const userId = req.user.uid;
    const data = req.body || {};
    const { listingId } = data;

    if (!listingId) {
      return res.status(400).json({ success: false, error: 'listingId is required' });
    }

    const listingSnap = await adminDb.doc(`listings/${listingId}`).get();
    if (!listingSnap.exists) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }
    const listing = listingSnap.data();
    if (listing.sellerId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the seller can submit a drop for this listing' });
    }
    if (listing.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Listing must be active to be submitted as a Friday Drop' });
    }

    // Server-side EAT scheduling (same business rules as the frontend utils).
    const week = getCurrentDropWeek(new Date());
    const fridayDateISO = week.fridayISO;

    const dropRef = await adminDb.collection('fridayDrops').add({
      ...cleanDropData(data),
      weekNum: week.weekNum,
      year: week.year,
      fridayDateISO,
      status: 'pending',
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedAt: null,
      rejectionReason: null,
    });

    const drop = { id: dropRef.id, ...cleanDropData(data), fridayDateISO };
    const sellerEmail = await getUserEmail(userId);
    await sendFridayDropEmail(drop, sellerEmail, { live: isFriday(new Date()) });

    return res.json({ success: true, dropId: dropRef.id, fridayDateISO, live: isFriday(new Date()) });
  } catch (err) {
    console.error('Drop submit error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit Friday Drop' });
  }
}

module.exports = { submitDrop };