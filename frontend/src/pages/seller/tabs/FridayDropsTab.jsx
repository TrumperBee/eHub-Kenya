import { useState, useEffect, useCallback } from 'react';
import { Plus, Flame, AlertTriangle, Package, Tag, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscribeToSellerDrops, submitDrop, getSellerDropForListing } from '../../../services/fridayDropsService';
import { getSellerListings } from '../../../services/listingsService';
import { formatKES } from '../../../utils/formatters';
import { calcDiscount, getCurrentDropWeek, formatFridayLabel } from '../../../utils/fridayUtils';
import CountdownTimer from '../../../components/drops/CountdownTimer';

const STATUS_BADGE = {
  pending: { label: 'PENDING', bg: '#FEF3C7', color: '#B45309' },
  approved: { label: 'APPROVED', bg: '#D1FAE5', color: '#047857' },
  rejected: { label: 'REJECTED', bg: '#FEE2E2', color: '#B91C1C' },
  expired: { label: 'EXPIRED', bg: '#F3F4F6', color: '#6B7280' },
};

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-48" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

export default function FridayDropsTab({ profile, user }) {
  const [drops, setDrops] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [dropPrice, setDropPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const week = getCurrentDropWeek();

  const fetchData = useCallback(() => {
    if (!profile) return;
    const unsub = subscribeToSellerDrops(
      profile.uid,
      (items) => {
        setDrops(items);
        setLoading(false);
      },
      (err) => {
        console.error('Drops subscription error:', err);
        setError('Failed to load your drops');
        setLoading(false);
      }
    );
    return unsub;
  }, [profile]);

  useEffect(() => {
    const unsub = fetchData();
    return unsub;
  }, [fetchData]);

  useEffect(() => {
    if (!profile) return;
    getSellerListings(profile.uid)
      .then((items) => setListings(items.filter((l) => l.status === 'active')))
      .catch(() => {});
  }, [profile]);

  const openModal = () => {
    setSelectedListingId('');
    setDropPrice('');
    setShowModal(true);
  };

  const selectedListing = listings.find((l) => l.id === selectedListingId);
  const selectedPrice = Number(dropPrice) || 0;
  const discount = calcDiscount(selectedListing?.price, selectedPrice);

  const handleSubmit = async () => {
    if (!selectedListing) {
      toast.error('Select an account to drop');
      return;
    }
    const price = Number(dropPrice) || 0;
    if (price <= 0 || price >= selectedListing.price) {
      toast.error('Drop price must be lower than the listing price');
      return;
    }
    const existing = await getSellerDropForListing(profile.uid, selectedListing.id);
    const alreadyThisWeek = existing.some((d) => d.year === week.year && Number(d.weekNum) === week.weekNum && (d.status === 'pending' || d.status === 'approved'));
    if (alreadyThisWeek) {
      toast.error('This account already has a drop for this Friday');
      return;
    }
    if (discount < 5) {
      toast.error('Drop must be at least 5% off to go live');
      return;
    }

    setSubmitting(true);
    try {
      await submitDrop({
        listingId: selectedListing.id,
        sellerId: profile.uid,
        sellerName: profile.sellerDisplayName || profile.displayName || 'Unknown Seller',
        sellerPhotoURL: profile.photoURL || null,
        sellerRating: profile.sellerRating || 0,
        title: selectedListing.title,
        photo: selectedListing.photos?.[0] || null,
        tier: selectedListing.tier || 'bronze',
        platform: selectedListing.platform || 'android',
        regularPrice: selectedListing.price,
        dropPrice: price,
        featuredPlayers: selectedListing.featuredPlayers || [],
        goldCoins: selectedListing.goldCoins || 0,
        gp: selectedListing.gp || 0,
        fiveStarCount: selectedListing.fiveStarCount || 0,
      });
      toast.success('Drop submitted for review!');
      setShowModal(false);
    } catch (err) {
      console.error('Submit drop error:', err);
      toast.error('Failed to submit drop');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = weeklyAll(drops, week).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-extrabold flex items-center gap-2" style={{ color: '#111' }}>
            <Flame size={22} style={{ color: '#C8102E' }} /> FRIDAY DROPS
          </h2>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Deals go live {formatFridayLabel(week.fridayISO)} at 12:00 EAT</p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center gap-2 text-sm" style={{ background: '#FFF100', color: '#111' }}>
          <Plus size={16} /> SUBMIT A DROP
        </button>
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #001E7A 0%, #003BFF 100%)', border: '1px solid #FFF100' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FFF100', color: '#111' }}>
            <Flame size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base font-extrabold uppercase" style={{ color: '#FFFFFF' }}>How Friday Drops Work</h3>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Set a discounted price on an active account and submit it as a Friday Drop. Our team reviews every submission, then approved drops
              go live marketplace-wide on Friday 12:00 EAT for that week only. No extra fees, and buyers only ever pay your drop price at checkout.
            </p>
            <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <li className="flex items-center gap-1.5"><span style={{ color: '#FFF100' }}>1.</span> Submit an active listing at 5%+ off</li>
              <li className="flex items-center gap-1.5"><span style={{ color: '#FFF100' }}>2.</span> Our team approves it</li>
              <li className="flex items-center gap-1.5"><span style={{ color: '#FFF100' }}>3.</span> Goes live Friday in the marketplace</li>
              <li className="flex items-center gap-1.5"><span style={{ color: '#FFF100' }}>4.</span> Sells at your drop price, protected by eHub</li>
            </ul>
          </div>
          <div className="shrink-0 text-center sm:text-right sm:border-l sm:border-white/20 sm:pl-5">
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: '#FFF100' }}>Next drop window</p>
            <CountdownTimer compact />
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="rounded-xl p-6 text-center" style={{ background: '#FEF2F2', border: '1px solid #C8102E' }}>
          <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#C8102E' }} />
          <p className="text-sm font-medium mb-2" style={{ color: '#111' }}>Could not load your drops</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchData(); }}
            className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors"
            style={{ borderColor: '#003BFF', color: '#003BFF' }}
          >
            RETRY
          </button>
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#EFF6FF', border: '1px dashed #003BFF' }}>
              <Flame size={40} className="mx-auto mb-3" style={{ color: '#C8102E' }} />
              <h3 className="font-heading text-xl font-extrabold mb-2" style={{ color: '#003BFF' }}>NO DROPS THIS WEEK</h3>
              <p className="text-sm max-w-md mx-auto mb-6" style={{ color: '#6B7280' }}>
                Submit one of your active listings at a discount and it will go live across the marketplace on Friday 12:00 EAT.
              </p>
              <button onClick={openModal} className="btn-primary text-sm" style={{ background: '#FFF100', color: '#111' }}>
                + SUBMIT YOUR FIRST DROP
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((drop) => {
                const badge = STATUS_BADGE[drop.status] || STATUS_BADGE.expired;
                return (
                  <div key={drop.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {drop.photo ? (
                        <img src={drop.photo} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center" style={{ background: '#F0F4FF' }}>
                          <Package size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#111' }}>{drop.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                          <span className="line-through mr-2">{formatKES(drop.regularPrice)}</span>
                          <span style={{ color: '#C8102E', fontWeight: 700 }}>{formatKES(drop.dropPrice)}</span>
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
                            <Tag size={10} /> -{drop.discountPercent}%
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{drop.fridayDateISO}</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      {drop.status === 'rejected' && drop.rejectionReason && (
                        <span className="text-[11px] hidden md:inline" style={{ color: '#6B7280' }} title={drop.rejectionReason}>Why?</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#E0E0E0' }}>
        <h3 className="font-heading text-sm font-bold uppercase mb-3" style={{ color: '#003BFF' }}>
          <CalendarDays size={14} className="inline" /> DROP RULES
        </h3>
        <ul className="space-y-1.5 text-sm" style={{ color: '#374151' }}>
          <li> Each drop needs to be at least 5% below your regular listing price.</li>
          <li> Only one active drop per account per week.</li>
          <li> Drops are reviewed and approved before going live on Friday 12:00 EAT.</li>
          <li> Drops can be edited only while still pending approval.</li>
        </ul>
        <p className="text-xs mt-3 pt-3" style={{ color: '#6B7280', borderTop: '1px solid #E5E7EB' }}>
          Tip: You can also submit a Friday Drop for a brand-new account directly in the{' '}
          <span className="font-semibold" style={{ color: '#003BFF' }}>New Listing</span> flow — toggle
          "Friday Drop" and set a drop price while publishing.
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !submitting && setShowModal(false)}>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Flame size={22} style={{ color: '#C8102E' }} />
              <h3 className="font-heading text-lg font-bold" style={{ color: '#111' }}>SUBMIT A FRIDAY DROP</h3>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>
              Select Account
            </label>
            <select
              value={selectedListingId}
              onChange={(e) => setSelectedListingId(e.target.value)}
              className="w-full bg-[#F5F5F5] border border-[#E0E0E0] text-[#111] rounded-xl px-4 py-3 mb-4 text-sm"
            >
              <option value="">Choose an active listing</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.title} ({formatKES(l.price)})</option>
              ))}
            </select>

            {selectedListing && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: '#F5F5F5' }}>
                <p className="text-sm font-bold" style={{ color: '#111' }}>{selectedListing.title}</p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                  {selectedListing.tier}, {selectedListing.platform}, Regular {formatKES(selectedListing.price)}
                </p>
              </div>
            )}

            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>
              Drop Price (KES)
            </label>
            <input
              type="number"
              min="0"
              value={dropPrice}
              onChange={(e) => setDropPrice(e.target.value)}
              placeholder="e.g. 7500"
              className="w-full bg-[#F5F5F5] border border-[#E0E0E0] text-[#111] rounded-xl px-4 py-3 mb-4 text-sm focus:border-[#003BFF]"
            />

            {selectedListing && selectedPrice > 0 && (
              <div className="mb-4 p-3 rounded-xl flex items-center justify-between" style={{ background: discount >= 5 ? '#D1FAE5' : '#FEF3C7' }}>
                <span className="text-sm font-semibold" style={{ color: '#111' }}>
                  {discount >= 5 ? 'Great discount! Buyers will love this.' : 'Needs to be at least 5% off.'}
                </span>
                <span className="font-heading font-extrabold" style={{ color: discount >= 5 ? '#047857' : '#B45309' }}>
                  -{discount}%
                </span>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
                style={{ borderColor: '#D1D5DB', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: '#FFF100', color: '#111' }}
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function weeklyAll(drops, week) {
  return drops.filter((d) => d.year === week.year && Number(d.weekNum) === week.weekNum);
}