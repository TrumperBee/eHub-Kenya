import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, ShoppingBag, Wallet, User, Plus, Star, Loader, TrendingUp, PauseCircle, PlayCircle, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSellerListings, updateListing, deleteListingSoft } from '../../services/listingsService';
import { getSellerOrders } from '../../services/ordersService';
import { formatKES, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/transfer-room' },
  { id: 'listings', label: 'My Listings', icon: List, path: '/transfer-room' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/transfer-room/orders' },
  { id: 'earnings', label: 'Earnings', icon: Wallet, path: '/transfer-room/earnings' },
  { id: 'profile', label: 'Profile', icon: User, path: '/transfer-room/profile' },
];

const mobileTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/transfer-room' },
  { id: 'listings', label: 'Listings', icon: List, path: '/transfer-room' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/transfer-room/orders' },
  { id: 'earnings', label: 'Earnings', icon: Wallet, path: '/transfer-room/earnings' },
  { id: 'profile', label: 'Profile', icon: User, path: '/transfer-room/profile' },
];

function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl p-6" style={{ background: '#E0E7FF' }}>
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-300 rounded w-1/2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewError({ onRetry }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ background: '#FEF2F2', border: '1px solid #C8102E' }}>
      <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#C8102E' }} />
      <p className="text-sm font-medium mb-2" style={{ color: '#111' }}>Could not load your overview</p>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Check your connection and try again.</p>
      <button onClick={onRetry} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#003BFF', color: '#003BFF' }}>
        RETRY
      </button>
    </div>
  );
}

function OverviewTab({ listings, orders, loading, error, onRetry }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const activeCount = listings.filter(l => l.status === 'active').length;
  const soldCount = listings.filter(l => l.status === 'sold').length;
  const pendingOrders = orders.filter(o => ['payment_confirmed', 'in_transfer'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalEarned = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  if (loading) return <OverviewSkeleton />;
  if (error) return <OverviewError onRetry={onRetry} />;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ background: '#003BFF' }}>
        <div>
          <h2 className="font-heading text-xl font-extrabold text-white">WELCOME TO YOUR TRANSFER ROOM, {userProfile?.sellerDisplayName || userProfile?.displayName || 'SELLER'}!</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Manage your listings, track orders, and grow your sales.</p>
        </div>
        <button onClick={() => navigate('/transfer-room/new')} className="btn-primary flex items-center gap-2 shrink-0 text-sm" style={{ background: '#FFF100', color: '#111' }}>
          <Plus size={16} /> NEW LISTING →
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
          <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <p className="font-heading text-4xl font-extrabold mb-1" style={{ color: '#003BFF' }}>{activeCount}</p>
          <p className="text-sm font-semibold" style={{ color: '#111' }}>Active Listings</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg">📋</span>
            <span className="text-xs" style={{ color: '#6B7280' }}>Visible to buyers right now</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
          <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <p className="font-heading text-4xl font-extrabold mb-1" style={{ color: '#003BFF' }}>{soldCount}</p>
          <p className="text-sm font-semibold" style={{ color: '#111' }}>Accounts Sold</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg">✅</span>
            <span className="text-xs" style={{ color: '#6B7280' }}>Completed sales</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
          <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <p className="font-heading text-4xl font-extrabold mb-1" style={{ color: pendingOrders.length > 0 ? '#D97706' : '#003BFF' }}>{pendingOrders.length}</p>
          <p className="text-sm font-semibold" style={{ color: '#111' }}>Pending Orders</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg">⏳</span>
            <span className="text-xs" style={{ color: pendingOrders.length > 0 ? '#D97706' : '#6B7280' }}>{pendingOrders.length > 0 ? 'Action required' : 'Awaiting your action'}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
          <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <p className="font-heading text-4xl font-extrabold mb-1" style={{ color: '#003BFF' }}>{formatKES(totalEarned)}</p>
          <p className="text-sm font-semibold" style={{ color: '#111' }}>Total Earned</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg">💰</span>
            <span className="text-xs" style={{ color: '#6B7280' }}>From completed sales</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: '#FFF9E6', border: '1px solid #FFF100', borderLeft: '4px solid #FFF100' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">💡</span>
          <h3 className="font-heading text-sm font-bold uppercase" style={{ color: '#111' }}>SELLER QUICK GUIDE</h3>
        </div>
        <div className="text-sm leading-relaxed space-y-2" style={{ color: '#374151' }}>
          <p>Follow these steps to make your first sale:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li><strong>Create a listing</strong> — Go to "My Listings" {'→'} New Listing. Add clear photos of your squad, list your star players, and set a fair price.</li>
            <li><strong>Wait for a buyer</strong> — Once your listing is live, buyers can find it on the Browse page. You will receive a notification when someone pays.</li>
            <li><strong>Complete the transfer</strong> — When you get an order, go to "Orders", open the chat, and ask the buyer for their email. Then change your Konami account email to theirs.</li>
            <li><strong>Get paid</strong> — Once the buyer confirms they have the account, the escrow is released to your M-Pesa number automatically.</li>
          </ol>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #FFF100' }}>
            <p className="font-semibold mb-1">Tips for faster sales:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Upload clear, bright screenshots of your squad</li>
              <li>List all your 5-star and Legendary players by name</li>
              <li>Price competitively — check what similar accounts sell for</li>
              <li>Respond to buyers quickly once an order comes in</li>
            </ul>
          </div>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-heading text-base font-bold" style={{ color: '#003BFF' }}>RECENT ORDERS</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Listing</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Buyer</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Date</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.slice(0, 5).map(order => {
                  const statusColors = {
                    pending_payment: 'text-yellow-500',
                    payment_confirmed: 'text-blue-500',
                    in_transfer: 'text-purple-500',
                    completed: 'text-green-500',
                    disputed: 'text-red-500',
                    refunded: 'text-gray-400',
                    cancelled: 'text-gray-400',
                  };
                  return (
                    <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-5 py-3 font-medium max-w-[180px] truncate" style={{ color: '#111' }}>{order.listingTitle || 'Untitled'}</td>
                      <td className="px-5 py-3" style={{ color: '#6B7280' }}>{order.buyerDisplayName || 'Anonymous'}</td>
                      <td className="px-5 py-3 font-semibold" style={{ color: '#111' }}>{formatKES(order.amount)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${statusColors[order.status] || 'text-gray-400'}`}>
                          {(ORDER_STATUS_MAP[order.status] || order.status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-5 py-3" style={{ color: '#6B7280' }}>{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Link to={`/orders/${order.id}`} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors" style={{ background: '#EFF6FF', color: '#003BFF' }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const ORDER_STATUS_MAP = {
  pending_payment: 'Awaiting Payment',
  payment_confirmed: 'Payment Received',
  in_transfer: 'Account Transfer',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

function ListingsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-48" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingsError({ onRetry }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ background: '#FEF2F2', border: '1px solid #C8102E' }}>
      <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#C8102E' }} />
      <p className="text-sm font-medium mb-2" style={{ color: '#111' }}>Could not load your listings</p>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Check your connection and try again.</p>
      <button onClick={onRetry} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#003BFF', color: '#003BFF' }}>
        RETRY
      </button>
    </div>
  );
}

function ListingsTab({ listings, loading, error, onRetry, onRefresh }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const activeListings = listings.filter(l => l.status !== 'removed');
  const filtered = statusFilter === 'all' ? activeListings : activeListings.filter(l => l.status === statusFilter);

  const handleTogglePause = async (listing) => {
    const newStatus = listing.status === 'active' ? 'paused' : 'active';
    try {
      await updateListing(listing.id, { status: newStatus });
      toast.success(newStatus === 'active' ? 'Listing is now live' : 'Listing paused');
      onRefresh();
    } catch (err) {
      toast.error('Failed to update listing status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteListingSoft(deleteId);
      toast.success('Listing removed');
      setDeleteId(null);
      onRefresh();
    } catch (err) {
      toast.error('Failed to remove listing');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <ListingsSkeleton />;
  if (error) return <ListingsError onRetry={onRetry} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-heading text-2xl font-extrabold" style={{ color: '#111' }}>MY LISTINGS</h2>
        <button onClick={() => navigate('/transfer-room/new')} className="btn-primary flex items-center gap-2 text-sm" style={{ background: '#FFF100', color: '#111' }}>
          <Plus size={16} /> + NEW LISTING
        </button>
      </div>

      <div className="flex gap-1 rounded-xl p-1 overflow-x-auto" style={{ background: '#E0E0E0' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'paused', label: 'Paused' },
          { id: 'sold', label: 'Sold' },
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap min-h-[36px]"
            style={{
              background: statusFilter === filter.id ? '#003BFF' : 'transparent',
              color: statusFilter === filter.id ? '#FFFFFF' : '#6B7280',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {activeListings.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: '#EFF6FF', border: '1px dashed #003BFF' }}>
          <span className="text-5xl block mb-4">📦</span>
          <h3 className="font-heading text-xl font-extrabold mb-2" style={{ color: '#003BFF' }}>YOU HAVE NO LISTINGS YET</h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: '#6B7280' }}>
            Create your first listing to start selling. It takes less than 5 minutes. Add your squad photos, list your star players, set your price, and go live instantly.
          </p>
          <button onClick={() => navigate('/transfer-room/new')} className="btn-primary text-sm" style={{ background: '#FFF100', color: '#111' }}>
            + CREATE YOUR FIRST LISTING
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: '#6B7280' }}>No {statusFilter} listings found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(listing => (
            <div key={listing.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {listing.photos?.[0] ? (
                  <img src={listing.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-lg" style={{ background: '#F0F4FF' }}>📷</div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#111' }}>{listing.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{listing.tier} — {listing.platform} — {formatKES(listing.price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  listing.status === 'active' ? 'bg-green-100 text-green-700' :
                  listing.status === 'paused' ? 'bg-gray-100 text-gray-500' :
                  listing.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {listing.status === 'active' ? 'LIVE' :
                   listing.status === 'paused' ? 'PAUSED' :
                   listing.status === 'sold' ? 'SOLD' : listing.status}
                </span>
                {listing.viewCount > 0 && (
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>{listing.viewCount} views</span>
                )}
                <button
                  onClick={() => navigate(`/transfer-room/edit/${listing.id}`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[32px]"
                  style={{ borderColor: '#003BFF', color: '#003BFF' }}
                >
                  <Edit3 size={12} className="inline mr-1" /> Edit
                </button>
                {listing.status !== 'sold' && (
                  <button
                    onClick={() => handleTogglePause(listing)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[32px]"
                    style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
                  >
                    {listing.status === 'active' ? <PauseCircle size={12} className="inline mr-1" /> : <PlayCircle size={12} className="inline mr-1" />}
                    {listing.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                )}
                {listing.status !== 'sold' && (
                  <button
                    onClick={() => setDeleteId(listing.id)}
                    className="p-1.5 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                    style={{ color: '#C8102E' }}
                    title="Delete listing"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#E0E0E0' }}>
        <h3 className="font-heading text-sm font-bold uppercase mb-3" style={{ color: '#003BFF' }}>📌 LISTING TIPS</h3>
        <ul className="space-y-1.5 text-sm" style={{ color: '#374151' }}>
          <li>• Active listings appear on the Browse page and are visible to all buyers.</li>
          <li>• Paused listings are hidden from buyers but not deleted — useful if you need a break.</li>
          <li>• Once an account is sold, the listing is automatically marked as Sold.</li>
          <li>• You can only delete listings that have no ongoing orders.</li>
          <li>• Add up to 5 photos — listings with photos sell 3× faster.</li>
        </ul>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} style={{ color: '#C8102E' }} />
              <h3 className="font-heading text-lg font-bold" style={{ color: '#111' }}>Delete Listing?</h3>
            </div>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>This will remove the listing from the marketplace. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#D1D5DB', color: '#374151' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: '#C8102E' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransferRoomPage() {
  const { userProfile } = useAuth();
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');

  useEffect(() => {
    if (tabFromUrl && tabs.find(t => t.id === tabFromUrl)) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    try {
      const [l, o] = await Promise.all([
        getSellerListings(userProfile.uid),
        getSellerOrders(userProfile.uid),
      ]);
      setListings(l);
      setOrders(o);
    } catch (err) {
      console.error('TransferRoom fetch error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="pt-[68px] min-h-screen" style={{ background: '#F5F5F5' }}>
      <div className="flex">
        <aside className="hidden md:block w-60 shrink-0 min-h-[calc(100vh-68px)] p-4 sticky top-[68px]" style={{ background: '#001E7A' }}>
          <div className="mb-6">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider" style={{ color: '#FFF100' }}>TRANSFER ROOM</h2>
            <p className="text-sm text-white mt-2 truncate">{userProfile?.sellerDisplayName || userProfile?.displayName}</p>
            {userProfile?.sellerRating > 0 && (
              <p className="text-xs text-konami-gold"><Star size={12} className="inline" /> {userProfile.sellerRating.toFixed(1)}</p>
            )}
          </div>

          <nav className="space-y-1 mb-6">
            {tabs.map((tab) => {
              const isOverviewOrListings = tab.id === 'listings' || tab.id === 'overview';
              const isActive = isOverviewOrListings
                ? tab.id === activeTab
                : location.pathname === tab.path;

              if (isOverviewOrListings) {
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-heading font-bold uppercase tracking-wider transition-colors min-h-[44px]"
                    style={{
                      color: isActive ? '#FFF100' : 'rgba(255,255,255,0.7)',
                      background: isActive ? 'rgba(255,241,0,0.08)' : 'transparent',
                      borderLeft: isActive ? '3px solid #FFF100' : '3px solid transparent',
                    }}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                );
              }
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-heading font-bold uppercase tracking-wider transition-colors min-h-[44px]"
                  style={{
                    color: isActive ? '#FFF100' : 'rgba(255,255,255,0.7)',
                    background: isActive ? 'rgba(255,241,0,0.08)' : 'transparent',
                    borderLeft: isActive ? '3px solid #FFF100' : '3px solid transparent',
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <Link to="/transfer-room/new" className="btn-primary w-full flex items-center justify-center gap-2 text-sm" style={{ background: '#FFF100', color: '#111' }}>
            <Plus size={16} /> New Listing +
          </Link>
        </aside>

        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          <div className="md:hidden flex gap-1 mb-4 rounded-xl p-1 overflow-x-auto" style={{ background: '#E0E0E0' }}>
            {mobileTabs.map((tab) => {
              const isOverviewOrListings = tab.id === 'overview' || tab.id === 'listings';
              const isActive = isOverviewOrListings
                ? tab.id === activeTab
                : location.pathname === tab.path;

              if (isOverviewOrListings) {
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-heading font-bold uppercase whitespace-nowrap transition-colors min-h-[40px]"
                    style={{
                      background: isActive ? '#003BFF' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#6B7280',
                    }}
                  >
                    <tab.icon size={14} /> {tab.label}
                  </button>
                );
              }
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-heading font-bold uppercase whitespace-nowrap transition-colors min-h-[40px]"
                  style={{
                    background: isActive ? '#003BFF' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#6B7280',
                  }}
                >
                  <tab.icon size={14} /> {tab.label}
                </Link>
              );
            })}
          </div>

          {activeTab === 'overview' && (
            <OverviewTab
              listings={listings}
              orders={orders}
              loading={loading}
              error={error}
              onRetry={fetchData}
            />
          )}
          {activeTab === 'listings' && (
            <ListingsTab
              listings={listings}
              loading={loading}
              error={error}
              onRetry={fetchData}
              onRefresh={fetchData}
            />
          )}
        </main>
      </div>
    </div>
  );
}
