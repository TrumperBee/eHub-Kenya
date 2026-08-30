import { doc, setDoc, deleteDoc, getDoc, onSnapshot, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const toggleSaveListing = async (uid, listing) => {
  const ref = doc(db, 'users', uid, 'savedListings', listing.id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  } else {
    await setDoc(ref, {
      listingId: listing.id,
      savedAt: serverTimestamp(),
      listingSnapshot: {
        title: listing.title || 'Untitled Account',
        price: listing.price || 0,
        tier: listing.tier || 'bronze',
        platform: listing.platform || null,
        sellerId: listing.sellerId || '',
        sellerDisplayName: listing.sellerDisplayName || '',
        sellerPhotoURL: listing.sellerPhotoURL || null,
        sellerRating: listing.sellerRating || 0,
        fiveStarCount: listing.fiveStarCount || 0,
        goldCoins: listing.goldCoins || 0,
        gp: listing.gp || 0,
        featuredPlayers: listing.featuredPlayers?.slice(0, 3) || [],
        photos: listing.photos?.slice(0, 1) || [],
      }
    });
    return true;
  }
};

export const subscribeSavedListingIds = (uid, callback) => {
  const ref = collection(db, 'users', uid, 'savedListings');
  return onSnapshot(ref, snap => {
    const ids = snap.docs.map(d => d.id);
    callback(ids);
  });
};

export const getSavedListings = (uid, callback) => {
  const ref = collection(db, 'users', uid, 'savedListings');
  const q = query(ref, orderBy('savedAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};