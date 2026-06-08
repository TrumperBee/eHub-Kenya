import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSellerOrders } from '../../services/ordersService';
import { ORDER_STATUS } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';

const FILTER_TABS = ['all', 'pending_payment', 'in_transfer', 'completed', 'disputed'];

export default function SellerOrdersPage() {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);
    getSellerOrders(userProfile.uid).then(setOrders).finally(() => setLoading(false));
  }, [userProfile]);

  const filtered = activeFilter === 'all' ? orders : orders.filter(o => o.status === activeFilter);

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-extrabold text-konami-text mb-6">Orders</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILTER_TABS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === f
                  ? 'bg-konami-blue text-white'
                  : 'bg-white text-konami-text-muted hover:text-konami-text border border-konami-mid-gray'
              }`}
            >
              {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <ShoppingBag size={40} className="mx-auto mb-3 text-konami-text-muted" />
            <p className="text-konami-text-dim">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-konami-mid-gray text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Buyer</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Listing</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Amount</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Status</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Date</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-konami-mid-gray">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-konami-light-gray transition-colors">
                    <td className="py-3 text-sm text-konami-text">{order.buyerDisplayName || 'Anonymous'}</td>
                    <td className="py-3 text-sm text-konami-text-dim max-w-[200px] truncate">{order.listingTitle}</td>
                    <td className="py-3 text-sm font-semibold text-konami-text">{formatKES(order.amount)}</td>
                    <td className="py-3">
                      <span className={`text-xs ${ORDER_STATUS[order.status]?.color || 'text-konami-text-dim'}`}>
                        {ORDER_STATUS[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-konami-text-dim">{formatDate(order.createdAt)}</td>
                    <td className="py-3">
                      <Link to={`/orders/${order.id}`} className="btn-ghost text-xs">View Order</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
