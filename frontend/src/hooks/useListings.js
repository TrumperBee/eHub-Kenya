import { useState, useEffect, useCallback } from 'react';
import { getActiveListings, getListingById, getSellerListings, getFeaturedListings } from '../services/listingsService';

export function useListings(filters = {}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchListings = useCallback(async (append = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getActiveListings({ ...filters, lastDoc: append ? lastDoc : undefined });
      if (append) {
        setListings(prev => [...prev, ...result.listings]);
      } else {
        setListings(result.listings);
      }
      setLastDoc(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchListings(false);
  }, [fetchListings]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchListings(true);
    }
  };

  const refetch = () => fetchListings(false);

  return { listings, loading, error, hasMore, loadMore, refetch };
}

export function useListing(id) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getListingById(id)
      .then(setListing)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { listing, loading, error };
}

export function useSellerListings(sellerId) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    setError(null);
    getSellerListings(sellerId)
      .then(setListings)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [sellerId]);

  return { listings, loading, error };
}

export function useFeaturedListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedListings()
      .then(setListings)
      .finally(() => setLoading(false));
  }, []);

  return { listings, loading };
}
