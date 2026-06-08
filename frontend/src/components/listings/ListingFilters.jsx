import { useState, useEffect } from 'react';
import { X, Search, SlidersHorizontal } from 'lucide-react';
import { TIERS } from '../../utils/constants';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'views', label: 'Most Viewed' },
];

export default function ListingFilters({ filters, onFiltersChange }) {
  const [local, setLocal] = useState({
    searchQuery: '',
    tier: [],
    platform: 'all',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest',
  });

  useEffect(() => {
    if (filters) {
      setLocal(prev => ({ ...prev, ...filters }));
    }
  }, [filters]);

  const update = (field) => (e) => {
    const value = e.target.value;
    setLocal(prev => ({ ...prev, [field]: value }));
  };

  const toggleTier = (tier) => {
    setLocal(prev => {
      const tierArr = prev.tier.includes(tier)
        ? prev.tier.filter(t => t !== tier)
        : [...prev.tier, tier];
      return { ...prev, tier: tierArr };
    });
  };

  const applyFilters = () => {
    onFiltersChange({
      searchQuery: local.searchQuery,
      tier: local.tier,
      platform: local.platform,
      minPrice: local.minPrice,
      maxPrice: local.maxPrice,
      sortBy: local.sortBy,
    });
  };

  const clearFilters = () => {
    const cleared = { searchQuery: '', tier: [], platform: 'all', minPrice: '', maxPrice: '', sortBy: 'newest' };
    setLocal(cleared);
    onFiltersChange(cleared);
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
        <input
          type="text"
          placeholder="Search accounts..."
          value={local.searchQuery}
          onChange={update('searchQuery')}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          className="input-field pl-9"
        />
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E] mb-2">Tier</h4>
        <div className="space-y-1.5">
          {Object.entries(TIERS).map(([key, val]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={local.tier.includes(key)}
                onChange={() => toggleTier(key)}
                className="accent-[#BF0021]"
              />
              <span className="text-sm text-white">{val.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E] mb-2">Platform</h4>
        <div className="space-y-1.5">
          {[
            { value: 'all', label: 'All Platforms' },
            { value: 'android', label: 'Android' },
            { value: 'ios', label: 'iOS' },
            { value: 'both', label: 'Both' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="platform"
                value={opt.value}
                checked={local.platform === opt.value}
                onChange={update('platform')}
                className="accent-[#BF0021]"
              />
              <span className="text-sm text-white">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E] mb-2">Price Range (KES)</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={local.minPrice}
            onChange={update('minPrice')}
            className="input-field text-sm"
            min="0"
          />
          <span className="text-[#5C5C5C]">-</span>
          <input
            type="number"
            placeholder="Max"
            value={local.maxPrice}
            onChange={update('maxPrice')}
            className="input-field text-sm"
            min="0"
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E] mb-2">Sort By</h4>
        <select
          value={local.sortBy}
          onChange={update('sortBy')}
          className="input-field text-sm"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <button onClick={applyFilters} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
          <Search size={14} />
          Apply Filters
        </button>
        <button onClick={clearFilters} className="btn-secondary w-full text-sm">
          Clear Filters
        </button>
      </div>
    </div>
  );
}

export function MobileFilterDrawer({ open, onClose, filters, onFiltersChange }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[300px] max-w-[85vw] z-50 bg-[#0D0D0D] border-l border-[#2A2A2A] overflow-y-auto transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 bg-[#0D0D0D] z-10 flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h3 className="font-heading text-lg font-bold text-white">Filters</h3>
          <button onClick={onClose} className="text-[#9E9E9E] hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <ListingFilters filters={filters} onFiltersChange={(f) => { onFiltersChange(f); onClose(); }} />
        </div>
      </div>
    </>
  );
}
