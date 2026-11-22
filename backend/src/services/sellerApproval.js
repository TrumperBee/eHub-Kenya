// Seller approval sequence shared by the admin route.
//
// Dependencies are injected so the important guarantee — the welcome email is
// sent ONLY after both Firestore writes have succeeded — can be tested without
// Firebase or Resend.

const VALID_SELLER_UID = /^[A-Za-z0-9]{1,128}$/;

async function approveSellerApplication({
  uid,
  adminUid = '',
  sellerName = '',
  userRef,
  applicationRef,
  sendWelcome,
  serverTimestamp,
}) {
  if (!VALID_SELLER_UID.test(uid || '')) {
    const err = new Error('Invalid seller id');
    err.code = 'INVALID_SELLER_ID';
    throw err;
  }
  if (!userRef || !applicationRef || typeof sendWelcome !== 'function' || typeof serverTimestamp !== 'function') {
    throw new Error('approveSellerApplication: missing dependencies');
  }

  // 1. Persist the approval first. If either write fails, no email goes out.
  await userRef.update({
    role: 'seller',
    sellerApproved: true,
    sellerApprovedAt: serverTimestamp(),
    sellerApprovedBy: adminUid,
    updatedAt: serverTimestamp(),
  });
  await applicationRef.update({
    status: 'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
  });

  // 2. Welcome the seller. The sender is idempotent per uid and swallows its
  //    own failures, so a delivery problem cannot undo a saved approval.
  await sendWelcome({ uid, sellerName });
  return { uid };
}

module.exports = { approveSellerApplication, VALID_SELLER_UID };
