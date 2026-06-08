import { db } from './firebase';
import { collection, query, where, orderBy, limit, startAfter, getDocs, getDoc, doc, addDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const listingsRef = collection(db, 'listings');
const PAGE_SIZE = 12;

export const getActiveListings = async (filters = {}) => {
  let constraints = [
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
  ];

  if (filters.lastDoc) {
    constraints.push(startAfter(filters.lastDoc));
  }

  constraints.push(limit(PAGE_SIZE));

  let q = query(listingsRef, ...constraints);
  const snapshot = await getDocs(q);
  const listings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

  let result = listings;

  if (filters.tier && filters.tier.length > 0) {
    result = result.filter(l => filters.tier.includes(l.tier));
  }

  if (filters.platform && filters.platform !== 'all') {
    if (filters.platform === 'both') {
      result = result.filter(l => l.platform === 'both');
    } else {
      result = result.filter(l => l.platform === filters.platform || l.platform === 'both');
    }
  }

  if (filters.minPrice) {
    const min = Number(filters.minPrice);
    result = result.filter(l => l.price >= min);
  }

  if (filters.maxPrice) {
    const max = Number(filters.maxPrice);
    result = result.filter(l => l.price <= max);
  }

  if (filters.searchQuery) {
    const query_lower = filters.searchQuery.toLowerCase();
    result = result.filter(l => {
      const titleMatch = l.title?.toLowerCase().includes(query_lower);
      const playerMatch = (l.featuredPlayers || []).some(p => p.toLowerCase().includes(query_lower));
      return titleMatch || playerMatch;
    });
  }

  if (filters.sortBy === 'price_asc') {
    result.sort((a, b) => a.price - b.price);
  } else if (filters.sortBy === 'price_desc') {
    result.sort((a, b) => b.price - a.price);
  } else if (filters.sortBy === 'views') {
    result.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  }

  return { listings: result, lastVisible, hasMore: snapshot.docs.length === PAGE_SIZE };
};

export const getListingById = async (id) => {
  const snap = await getDoc(doc(db, 'listings', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getSellerListings = async (sellerId) => {
  const q = query(listingsRef, where('sellerId', '==', sellerId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createListing = async (data) => {
  return addDoc(listingsRef, {
    ...data,
    status: 'active',
    viewCount: 0,
    featured: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateListing = async (id, data) => {
  return updateDoc(doc(db, 'listings', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteListingSoft = async (id) => {
  return updateDoc(doc(db, 'listings', id), { status: 'removed', updatedAt: serverTimestamp() });
};

export const incrementViewCount = async (id) => {
  return updateDoc(doc(db, 'listings', id), { viewCount: increment(1) });
};

export const getFeaturedListings = async () => {
  const q = query(
    listingsRef,
    where('status', '==', 'active'),
    where('featured', '==', true),
    orderBy('createdAt', 'desc'),
    limit(6)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};
