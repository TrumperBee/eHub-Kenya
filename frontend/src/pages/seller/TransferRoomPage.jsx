import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, ShoppingBag, Wallet, User, Plus, Star, Loader, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSellerListings } from '../../services/listingsService';
import { getSellerOrders } from '../../services/ordersService';
import { formatKES, formatDate } from '../../utils/formatters';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/transfer-room' },
  { id: 'listings', label: 'My Listings', icon: List, path: '/transfer-room' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/transfer-room/orders' },
  { id: 'earnings', label: 'Earnings', icon: Wallet, path: '/transfer-room/earnings' },
  { id: 'profile', label: 'My Profile', icon: User, path: '/transfer-room/profile' },
];

const mobileTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/transfer-room' },
  { id: 'listings', label: 'Listings', icon: List, path: '/transfer-room' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/transfer-room/orders' },
  { id: 'earnings', label: 'Earnings', icon: Wallet, path: '/transfer-room/earnings' },
  { id: 'profile', label: 'Profile', icon: User, path: '/transfer-room/profile' },
];

function OverviewTab({ listings, orders, loading }) {
  const { userProfile } = useAuth();
  const activeListings = listings.filter(l => l.status === 'active' || l.status === 'paused');
  const pendingOrders = orders.filter(o => ['pending_payment', 'payment_confirmed', 'in_transfer'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalEarned = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader size={24} className="animate-spin text-[#BF0021]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Listings', value: activeListings.length, icon: List, color: '#BF0021' },
          { label: 'Pending Orders', value: pendingOrders.length, icon: Loader, color: '#D4AF37' },
          { label: 'Completed Sales', value: completedOrders.length, icon: ShoppingBag, color: '#22C55E' },
          { label: 'Total Earned', value: formatKES(totalEarned), icon: TrendingUp, color: '#BF0021' },
        ].map((stat, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#9E9E9E]">{stat.label}</p>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <p className="font-heading text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5 flex items-center gap-4">
        <Link to="/transfer-room/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Create New Listing
        </Link>
        <Link to="/transfer-room/orders" className="btn-secondary flex items-center gap-2">
          View Orders
        </Link>
      </div>

      <div className="card">
        <div className="p-5 border-b border-[#2A2A2A]">
          <h3 className="font-heading text-lg font-bold text-white">Recent Orders</h3>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center text-[#5C5C5C] text-sm">No orders yet.</div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]">
            {orders.slice(0, 5).map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#242424] transition-colors">
                <div>
                  <p className="text-sm text-white">{order.listingTitle || 'Order'}</p>
                  <p className="text-xs text-[#5C5C5C]">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatKES(order.amount)}</p>
                  <span className={`text-xs ${
                    order.status === 'completed' ? 'text-green-400' :
                    order.status === 'pending_payment' ? 'text-yellow-400' :
                    order.status === 'in_transfer' ? 'text-purple-400' : 'text-[#9E9E9E]'
                  }`}>
                    {order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5" style={{ borderLeft: '3px solid #BF0021' }}>
        <h3 className="font-heading text-lg font-bold text-white mb-2">Tips for Fast Sales</h3>
        <ul className="space-y-1 text-sm text-[#9E9E9E]">
          <li>• Upload high-quality squad photos</li>
          <li>• Write honest, detailed descriptions</li>
          <li>• Price competitively based on tier and stats</li>
          <li>• Respond to buyers quickly in chat</li>
          <li>• Keep your featured players list updated</li>
        </ul>
      </div>
    </div>
  );
}

function ListingsTab({ listings, loading }) {
  const navigate = useNavigate();
  if (loading) return <div className="flex justify-center py-12"><Loader size={24} className="animate-spin text-[#BF0021]" /></div>;
  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#9E9E9E] mb-4">You haven't created any listings yet.</p>
        <Link to="/transfer-room/new" className="btn-primary">Create Your First Listing</Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <div key={listing.id} className="card p-4 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{listing.title}</p>
            <p className="text-xs text-[#9E9E9E]">{formatKES(listing.price)} — {listing.tier} — {listing.platform}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <span className={`badge text-xs ${
              listing.status === 'active' ? 'bg-green-400/10 text-green-400' :
              listing.status === 'paused' ? 'bg-yellow-400/10 text-yellow-400' :
              listing.status === 'sold' ? 'bg-[#BF0021]/10 text-[#BF0021]' :
              'bg-[#242424] text-[#5C5C5C]'
            }`}>
              {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
            </span>
            <button onClick={() => navigate(`/transfer-room/edit/${listing.id}`)} className="btn-ghost text-xs">Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TransferRoomPage() {
  const { userProfile } = useAuth();
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');

  useEffect(() => {
    if (tabFromUrl && tabs.find(t => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);
    Promise.all([
      getSellerListings(userProfile.uid),
      getSellerOrders(userProfile.uid),
    ]).then(([l, o]) => {
      setListings(l);
      setOrders(o);
      setLoading(false);
    });
  }, [userProfile]);

  return (
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      <div className="flex">
        <aside className="hidden md:block w-60 shrink-0 min-h-[calc(100vh-64px)] border-r border-[#2A2A2A] bg-[#0D0D0D] p-4 sticky top-16">
          <div className="mb-6">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider" style={{ color: '#BF0021' }}>TRANSFER ROOM</h2>
            <p className="text-sm text-white mt-2 truncate">{userProfile?.sellerDisplayName || userProfile?.displayName}</p>
            {userProfile?.sellerRating > 0 && (
              <p className="text-xs text-[#D4AF37]"><Star size={12} className="inline" /> {userProfile.sellerRating.toFixed(1)}</p>
            )}
          </div>

          <nav className="space-y-1 mb-6">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              if (tab.id === 'listings' || tab.id === 'overview') {
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-[#BF0021]/10 text-[#BF0021]' : 'text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]'
                    }`}
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    location.pathname === tab.path ? 'bg-[#BF0021]/10 text-[#BF0021]' : 'text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <Link to="/transfer-room/new" className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
            <Plus size={16} /> New Listing
          </Link>
        </aside>

        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          <div className="md:hidden flex gap-1 mb-4 bg-[#1A1A1A] rounded-xl p-1 overflow-x-auto">
            {mobileTabs.map((tab) => (
              tab.id === 'overview' || tab.id === 'listings' ? (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'bg-[#BF0021] text-white' : 'text-[#9E9E9E]'
                  }`}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              ) : (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    location.pathname === tab.path ? 'bg-[#BF0021] text-white' : 'text-[#9E9E9E]'
                  }`}
                >
                  <tab.icon size={14} /> {tab.label}
                </Link>
              )
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab listings={listings} orders={orders} loading={loading} />}
          {activeTab === 'listings' && <ListingsTab listings={listings} loading={loading} />}
        </main>
      </div>
    </div>
  );
}
