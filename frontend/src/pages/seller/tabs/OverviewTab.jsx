import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, ArrowRight, Clipboard, CheckCircle, Clock, Wallet, Lightbulb } from 'lucide-react';
import { getSellerListings } from '../../../services/listingsService';
import { getSellerOrders } from '../../../services/ordersService';
import { formatKES, formatDate } from '../../../utils/formatters';

const ORDER_STATUS_MAP = {
  pending_payment: 'Awaiting Payment',
  payment_confirmed: 'Payment Received',
  in_transfer: 'Account Transfer',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

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

export default function OverviewTab({ profile, user, onTabChange }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [l, o] = await Promise.all([
        getSellerListings(profile.uid),
        getSellerOrders(profile.uid),
      ]);
      setListings(l);
      setOrders(o);
    } catch (err) {
      console.error('Overview fetch error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeCount = listings.filter(l => l.status === 'active').length;
  const soldCount = listings.filter(l => l.status === 'sold').length;
  const pendingOrders = orders.filter(o => ['payment_confirmed', 'in_transfer'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalEarned = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  if (loading) return <OverviewSkeleton />;
  if (error) return <OverviewError onRetry={fetchData} />;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ background: '#003BFF' }}>
        <div>
          <h2 className="font-heading text-xl font-extrabold text-white">WELCOME TO YOUR TRANSFER ROOM, {profile?.sellerDisplayName || profile?.displayName || 'SELLER'}!</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Manage your listings, track orders, and grow your sales.</p>
        </div>
        <button onClick={() => navigate('/transfer-room/new')} className="btn-primary flex items-center gap-2 shrink-0 text-sm" style={{ background: '#FFF100', color: '#111' }}>
          <Plus size={16} /> NEW LISTING <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
          <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <p className="font-heading text-4xl font-extrabold mb-1" style={{ color: '#003BFF' }}>{activeCount}</p>
          <p className="text-sm font-semibold" style={{ color: '#111' }}>Active Listings</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg"><Clipboard size={20} /></span>
            <span className="text-xs" style={{ color: '#6B7280' }}>Visible to buyers right now</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
          <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <p className="font-heading text-4xl font-extrabold mb-1" style={{ color: '#003BFF' }}>{soldCount}</p>
          <p className="text-sm font-semibold" style={{ color: '#111' }}>Accounts Sold</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg"><CheckCircle size={20} /></span>
            <span className="text-xs" style={{ color: '#6B7280' }}>Completed sales</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
          <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <p className="font-heading text-4xl font-extrabold mb-1" style={{ color: pendingOrders.length > 0 ? '#D97706' : '#003BFF' }}>{pendingOrders.length}</p>
          <p className="text-sm font-semibold" style={{ color: '#111' }}>Pending Orders</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg"><Clock size={20} /></span>
            <span className="text-xs" style={{ color: pendingOrders.length > 0 ? '#D97706' : '#6B7280' }}>{pendingOrders.length > 0 ? 'Action required' : 'Awaiting your action'}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
          <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <p className="font-heading text-4xl font-extrabold mb-1" style={{ color: '#003BFF' }}>{formatKES(totalEarned)}</p>
          <p className="text-sm font-semibold" style={{ color: '#111' }}>Total Earned</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg"><Wallet size={20} /></span>
            <span className="text-xs" style={{ color: '#6B7280' }}>From completed sales</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: '#FFF9E6', border: '1px solid #FFF100', borderLeft: '4px solid #FFF100' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl"><Lightbulb size={24} /></span>
          <h3 className="font-heading text-sm font-bold uppercase" style={{ color: '#111' }}>SELLER QUICK GUIDE</h3>
        </div>
        <div className="text-sm leading-relaxed space-y-2" style={{ color: '#374151' }}>
          <p>Follow these steps to make your first sale:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li><strong>Create a listing</strong> — Go to "My Listings" <ArrowRight size={14} className="inline" /> New Listing. Add clear photos of your squad, list your star players, and set a fair price.</li>
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
