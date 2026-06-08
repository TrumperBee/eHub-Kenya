import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
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
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider" style={{ color: '#003BFF' }}>FILTERS</h3>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
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
        <h4 className="font-heading text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: '#111111' }}>Tier</h4>
        <div className="space-y-1.5">
          {Object.entries(TIERS).map(([key, val]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer min-h-[32px]">
              <input
                type="checkbox"
                checked={local.tier.includes(key)}
                onChange={() => toggleTier(key)}
                style={{ accentColor: '#003BFF' }}
              />
              <span className="text-sm" style={{ color: '#111111' }}>{val.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-heading text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: '#111111' }}>Platform</h4>
        <div className="space-y-1.5">
          {[
            { value: 'all', label: 'All Platforms' },
            { value: 'android', label: 'Android' },
            { value: 'ios', label: 'iOS' },
            { value: 'both', label: 'Both' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer min-h-[32px]">
              <input
                type="radio"
                name="platform"
                value={opt.value}
                checked={local.platform === opt.value}
                onChange={update('platform')}
                style={{ accentColor: '#003BFF' }}
              />
              <span className="text-sm" style={{ color: '#111111' }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-heading text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: '#111111' }}>Price Range (KES)</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={local.minPrice}
            onChange={update('minPrice')}
            className="input-field text-sm"
            min="0"
          />
          <span style={{ color: '#6B7280' }}>-</span>
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
        <h4 className="font-heading text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: '#111111' }}>Sort By</h4>
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
        <button onClick={applyFilters} className="btn-blue w-full text-sm !py-3">Apply Filters</button>
        <button onClick={clearFilters} className="w-full text-sm font-medium text-center" style={{ color: '#003BFF' }}>
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
        className={`fixed top-0 right-0 h-full w-[300px] max-w-[85vw] z-50 bg-white overflow-y-auto transition-transform duration-300 shadow-card-lg ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
          <h3 className="font-heading text-lg font-bold uppercase" style={{ color: '#003BFF' }}>Filters</h3>
          <button onClick={onClose} className="min-h-[48px] min-w-[48px] flex items-center justify-center" style={{ color: '#6B7280' }}>
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
