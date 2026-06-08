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
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="section-heading mb-6">Orders</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILTER_TABS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === f
                  ? 'bg-[#BF0021] text-white'
                  : 'bg-[#1A1A1A] text-[#9E9E9E] hover:text-white border border-[#2A2A2A]'
              }`}
            >
              {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <ShoppingBag size={40} className="mx-auto mb-3 text-[#5C5C5C]" />
            <p className="text-[#9E9E9E]">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Buyer</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Listing</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Amount</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Status</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Date</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-[#242424] transition-colors">
                    <td className="py-3 text-sm text-white">{order.buyerDisplayName || 'Anonymous'}</td>
                    <td className="py-3 text-sm text-[#9E9E9E] max-w-[200px] truncate">{order.listingTitle}</td>
                    <td className="py-3 text-sm font-semibold text-white">{formatKES(order.amount)}</td>
                    <td className="py-3">
                      <span className={`text-xs ${ORDER_STATUS[order.status]?.color || 'text-[#9E9E9E]'}`}>
                        {ORDER_STATUS[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-[#9E9E9E]">{formatDate(order.createdAt)}</td>
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
