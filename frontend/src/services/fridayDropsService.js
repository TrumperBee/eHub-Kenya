import { db } from './firebase';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, increment, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { calcDiscount, getCurrentDropWeek } from '../utils/fridayUtils';

const dropsRef = collection(db, 'fridayDrops');

const SERIES = (arr) => (Array.isArray(arr) ? arr : []);

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

export const submitDrop = async (data) => {
  const week = getCurrentDropWeek();
  const ref = await addDoc(dropsRef, {
    ...cleanDropData(data),
    weekNum: week.weekNum,
    year: week.year,
    fridayDateISO: week.fridayISO,
    status: 'pending',
    submittedAt: serverTimestamp(),
    reviewedAt: null,
    rejectionReason: null,
  });
  return ref;
};

const mapSnap = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export const subscribeToActiveDrops = (callback, onError) => {
  const q = query(dropsRef, where('status', '==', 'approved'));
  return onSnapshot(q, (snap) => callback(mapSnap(snap)), (err) => onError && onError(err));
};

export const subscribeToSellerDrops = (sellerId, callback, onError) => {
  const q = query(dropsRef, where('sellerId', '==', sellerId));
  return onSnapshot(q, (snap) => callback(mapSnap(snap)), (err) => onError && onError(err));
};

export const subscribeToPendingDrops = (callback, onError) => {
  const q = query(dropsRef, where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => callback(mapSnap(snap)), (err) => onError && onError(err));
};

export const subscribeToAllDrops = (callback, onError) => {
  return onSnapshot(dropsRef, (snap) => callback(mapSnap(snap)), (err) => onError && onError(err));
};

export const getSellerDropForListing = async (sellerId, listingId) => {
  const q = query(dropsRef, where('sellerId', '==', sellerId), where('listingId', '==', listingId));
  const snap = await getDocs(q);
  return mapSnap(snap);
};

export const getDropsForListing = async (listingId) => {
  const q = query(dropsRef, where('listingId', '==', listingId));
  const snap = await getDocs(q);
  return mapSnap(snap);
};

export const setDropStatus = async (dropId, data) => {
  return updateDoc(doc(db, 'fridayDrops', dropId), {
    ...data,
    reviewedAt: serverTimestamp(),
  });
};

export const approveDrop = async (dropId) => setDropStatus(dropId, { status: 'approved' });

export const rejectDrop = async (dropId, reason) =>
  setDropStatus(dropId, { status: 'rejected', rejectionReason: reason || '' });

export const expireDrop = async (dropId) => setDropStatus(dropId, { status: 'expired' });

export const incrementDropViews = async (dropId) =>
  updateDoc(doc(db, 'fridayDrops', dropId), { views: increment(1) });