import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getBuyerOrders } from '../../services/ordersService';
import { ORDER_STATUS } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const ACTIVE_STATUSES = ['pending_payment', 'payment_confirmed', 'in_transfer', 'disputed'];

export default function MyOrdersPage() {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);
    getBuyerOrders(userProfile.uid).then(setOrders).finally(() => setLoading(false));
  }, [userProfile]);

  const filtered = activeFilter === 'all' ? orders
    : activeFilter === 'active' ? orders.filter(o => ACTIVE_STATUSES.includes(o.status))
    : orders.filter(o => o.status === 'completed');

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-extrabold text-konami-text mb-6">My Orders</h1>

        <div className="flex gap-2 mb-6">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === tab.key
                  ? 'bg-konami-blue text-white'
                  : 'bg-white text-konami-text-muted hover:text-konami-text border border-konami-mid-gray'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <ShoppingBag size={48} className="mx-auto mb-4 text-konami-text-muted" />
            <p className="text-konami-text-dim mb-2">No orders yet</p>
            <Link to="/browse" className="btn-primary inline-block text-sm mt-2">
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const statusConfig = ORDER_STATUS[order.status] || {};
              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="card p-4 flex items-center gap-4 hover:border-konami-blue/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-konami-text truncate">
                      {order.listingTitle || 'Unnamed Listing'}
                    </p>
                    <p className="text-xs text-konami-text-muted mt-0.5">
                      {order.sellerDisplayName || 'Unknown Seller'} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-konami-text">{formatKES(order.amount)}</p>
                    <span className={`text-xs ${statusConfig.color || 'text-konami-text-dim'}`}>
                      {statusConfig.label || order.status}
                    </span>
                  </div>
                  <span className="text-xs text-konami-text-muted hover:text-konami-blue ml-2">View →</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
