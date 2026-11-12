import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getBuyerOrders } from '../../services/ordersService';
import { ORDER_STATUS } from '../../utils/constants';
import { PAID_AND_PENDING_STATUSES } from '../../utils/orderMachine';
import { formatKES, formatDate } from '../../utils/formatters';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const ACTIVE_STATUSES = ['pending_payment', ...PAID_AND_PENDING_STATUSES, 'disputed'];

const PAYMENT_STATUS = {
  paid:      { label: 'Paid',      bg: 'bg-green-100', text: 'text-green-700' },
  pending:   { label: 'Pending',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  abandoned: { label: 'Abandoned', bg: 'bg-gray-100',   text: 'text-gray-500' },
};

function OrderSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 bg-konami-mid-gray rounded" />
          <div className="h-3 w-1/2 bg-konami-mid-gray rounded" />
        </div>
        <div className="h-6 w-20 bg-konami-mid-gray rounded" />
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!userProfile) return undefined;
    let active = true;
    getBuyerOrders(userProfile.uid)
      .then((rows) => {
        if (active) setOrders(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userProfile]);

  const filtered = activeFilter === 'all' ? orders
    : activeFilter === 'active' ? orders.filter(o => ACTIVE_STATUSES.includes(o.status))
    : orders.filter(o => o.status === 'completed');

  return (
    <div className="w-full max-w-screen overflow-x-hidden pt-16 pb-20 md:pb-0 min-h-screen bg-konami-light-gray animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-konami-text mb-6 uppercase tracking-wide">My Orders</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-heading font-bold uppercase tracking-wide whitespace-nowrap transition-all duration-200 active:scale-[0.97] ${
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
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <OrderSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 md:p-12 text-center">
            <span className="w-16 h-16 rounded-full bg-konami-light-gray flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={30} className="text-konami-text-muted" />
            </span>
            <h2 className="font-heading text-lg font-bold text-konami-text uppercase tracking-wide mb-1">No orders yet</h2>
            <p className="text-sm text-konami-text-muted mb-6">Browse accounts to get started.</p>
            <Link to="/browse" className="btn-primary inline-flex items-center justify-center text-sm mt-2">
              Browse Accounts
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
                  className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:border-konami-blue/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-konami-text truncate">
                      {order.listingTitle || 'Unnamed Listing'}
                    </p>
                    <p className="text-xs text-konami-text-muted mt-0.5">
                      {order.sellerDisplayName || 'Unknown Seller'} - {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:block sm:text-right shrink-0 gap-3">
                    <p className="text-sm font-bold text-konami-text">{formatKES(order.amount)}</p>
                    <span className={`text-xs ${statusConfig.color || 'text-konami-text-dim'}`}>
                      {statusConfig.label || order.status}
                    </span>
                    {PAYMENT_STATUS[order.paymentStatus] && (
                      <span className={`ml-2 inline-block text-[11px] px-1.5 py-0.5 rounded-full font-medium ${PAYMENT_STATUS[order.paymentStatus].bg} ${PAYMENT_STATUS[order.paymentStatus].text}`}>
                        {PAYMENT_STATUS[order.paymentStatus].label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-konami-text-muted hover:text-konami-blue sm:ml-2 inline-flex items-center gap-1">
                    View <ArrowRight size={12} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
