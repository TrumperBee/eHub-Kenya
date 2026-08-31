import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { subscribeToActiveDrops } from '../services/fridayDropsService';
import { classifyDrop } from '../utils/fridayUtils';

const FridayDropContext = createContext({ getDropForListing: () => null, approvedDrops: [] });

export function FridayDropProvider({ children }) {
  const [approvedDrops, setApprovedDrops] = useState([]);

  useEffect(() => {
    const unsub = subscribeToActiveDrops(
      (items) => setApprovedDrops(items),
      () => {}
    );
    return unsub;
  }, []);

  // Returns the most relevant approved drop for a listing within its active/upcoming
  // window, tagged with its classified state ('live' | 'upcoming'), or null when there is
  // no in-window drop (covers expired/past drops so listings revert to normal pricing).
  const getDropForListing = useCallback(
    (listingId) => {
      if (!listingId) return null;
      const now = new Date();
      const candidates = approvedDrops
        .filter((d) => d.listingId === listingId)
        .map((d) => ({ ...d, state: classifyDrop(d, now) }))
        .filter((d) => d.state === 'live' || d.state === 'upcoming')
        .sort((a, b) => {
          if (a.state === b.state) return b.dropPrice - a.dropPrice;
          return a.state === 'live' ? -1 : 1;
        });
      return candidates[0] || null;
    },
    [approvedDrops]
  );

  return (
    <FridayDropContext.Provider value={{ getDropForListing, approvedDrops }}>
      {children}
    </FridayDropContext.Provider>
  );
}

export function useFridayDrop() {
  return useContext(FridayDropContext);
}
