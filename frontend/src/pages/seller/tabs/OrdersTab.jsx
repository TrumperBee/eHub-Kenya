import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, AlertTriangle, ChevronUp, ChevronDown, Store, Upload, MessageSquare } from 'lucide-react';
import { getSellerOrders } from '../../../services/ordersService';
import { ORDER_STATUS } from '../../../utils/constants';
import { formatKES, formatDate } from '../../../utils/formatters';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending Delivery' },
  { id: 'submitted', label: 'Awaiting Confirmation' },
  { id: 'completed', label: 'Completed' },
  { id: 'disputed', label: 'Disputed' },
];

const FILTER_MATCH = {
  all: () => true,
  pending: (s) => ['awaiting_seller_delivery', 'payment_confirmed'].includes(s),
  submitted: (s) => ['credentials_submitted', 'in_transfer'].includes(s),
  completed: (s) => s === 'completed',
  disputed: (s) => s === 'disputed',
};

const ACTIONS_REQUIRED_STATUSES = ['awaiting_seller_delivery', 'payment_confirmed'];

function OrdersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-24 bg-blue-50 rounded-xl" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-9 bg-gray-200 rounded-lg w-20" />)}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-36" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersError({ onRetry }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ background: '#FEF2F2', border: '1px solid #C8102E' }}>
      <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#C8102E' }} />
      <p className="text-sm font-medium mb-2" style={{ color: '#111' }}>Could not load your orders</p>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Check your connection and try again.</p>
      <button onClick={onRetry} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#003BFF', color: '#003BFF' }}>
        RETRY
      </button>
    </div>
  );
}

function EmptyState({ filter, onTabChange }) {
  if (filter === 'all') {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4"><Store size={48} /></span>
        <h3 className="font-heading text-xl font-extrabold mb-2" style={{ color: '#003BFF' }}>NO ORDERS YET</h3>
        <p className="text-sm max-w-md mx-auto mb-6" style={{ color: '#6B7280' }}>
          When a buyer purchases one of your listings, their order will appear here. Make sure your listings are active and priced competitively.
        </p>
        <button onClick={() => onTabChange('listings')} className="btn-primary text-sm" style={{ background: '#FFF100', color: '#111' }}>
          VIEW MY LISTINGS
        </button>
      </div>
    );
  }
  const messages = {
    pending: 'No orders awaiting delivery. All caught up!',
    submitted: 'No orders awaiting buyer confirmation.',
    completed: 'No completed orders yet. Keep selling!',
    disputed: 'No disputes. Great work!',
  };
  return (
    <div className="text-center py-12">
      <p className="text-sm" style={{ color: '#6B7280' }}>{messages[filter] || 'No orders found.'}</p>
    </div>
  );
}

export default function OrdersTab({ profile, user, onTabChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [guideOpen, setGuideOpen] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSellerOrders(profile.uid);
      setOrders(data);
    } catch (err) {
      console.error('Orders fetch error:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = orders.filter((o) => FILTER_MATCH[activeFilter](o.status));
  const statusCounts = {};
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  const actionCount = orders.filter((o) => ACTIONS_REQUIRED_STATUSES.includes(o.status)).length;

  const hasOldPending = orders.some(o => {
    if (!ACTIONS_REQUIRED_STATUSES.includes(o.status)) return false;
    if (!o.createdAt) return false;
    const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    const hoursOld = (Date.now() - d.getTime()) / 3600000;
    return hoursOld > 2;
  });

  if (loading) return <OrdersSkeleton />;
  if (error) return <OrdersError onRetry={fetchData} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-extrabold" style={{ color: '#111' }}>MY ORDERS</h1>
        <span className="text-sm font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: '#003BFF' }}>
          {orders.length} order{orders.length !== 1 ? 's' : ''} total
        </span>
      </div>

      {hasOldPending && (
        <div className="rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ background: '#FEF2F2', border: '1px solid #C8102E', borderLeft: '4px solid #C8102E' }}>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0"><AlertTriangle size={20} /></span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#111' }}>
                You have {actionCount} order(s) waiting for your action.
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                Buyers have paid and are waiting for you to submit the eFootball account details. Respond within 24 hours to avoid a dispute.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveFilter('pending')}
            className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors shrink-0" style={{ background: '#C8102E' }}
          >
            VIEW PENDING ORDERS
          </button>
        </div>
      )}

      <div className="rounded-xl p-4 mb-6" style={{ background: '#EFF6FF', borderLeft: '4px solid #003BFF' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-xs font-bold uppercase" style={{ color: '#003BFF' }}>HOW ORDERS WORK</h3>
          <button onClick={() => setGuideOpen(!guideOpen)} className="text-xs font-semibold min-h-[28px] min-w-[28px] flex items-center justify-center" style={{ color: '#003BFF' }}>
            {guideOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        {guideOpen && (
          <div className="text-xs leading-relaxed space-y-1.5" style={{ color: '#374151' }}>
            <p>When a buyer pays for your listing, the order is locked and appears here as "Pending Delivery". Follow these steps for every order:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li><strong>Open the order</strong> — you'll see the buyer's paid status and the account delivery form.</li>
              <li><strong>Submit the eFootball account login details</strong> (email and password) using the form. They're delivered privately inside the order.</li>
              <li><strong>Tell the buyer the details were submitted</strong> in the order chat.</li>
              <li>The buyer logs in, changes the password, and confirms delivery.</li>
              <li>Once confirmed, the admin processes and sends your payout to your registered payout phone number.</li>
            </ol>
            <p className="mt-1 font-semibold" style={{ color: '#C8102E' }}><AlertTriangle size={14} className="inline" /> Important: Never ask buyers to pay outside this platform, and never share login details in public chats or messages. Escrow protects both of you.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => {
          const count = f.id === 'all' ? orders.length : orders.filter((o) => FILTER_MATCH[f.id](o.status)).length;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === f.id
                  ? 'text-white' : ''
              }`}
              style={{
                background: activeFilter === f.id ? '#003BFF' : '#FFFFFF',
                color: activeFilter === f.id ? '#FFFFFF' : '#6B7280',
                border: activeFilter === f.id ? 'none' : '1px solid #D1D5DB',
              }}
            >
              {f.label}{count > 0 ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState filter={activeFilter} onTabChange={onTabChange} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Listing</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Buyer Name</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Date</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => {
                  const needsAction = ACTIONS_REQUIRED_STATUSES.includes(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium max-w-[200px] truncate" style={{ color: '#111' }}>{order.listingTitle || 'Untitled'}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#6B7280' }}>{order.buyerDisplayName || 'Anonymous'}</td>
                      <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#111' }}>{formatKES(order.amount)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${ORDER_STATUS[order.status]?.color || 'text-gray-400'}`}>
                          {ORDER_STATUS[order.status]?.label || order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#6B7280' }}>{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/orders/${order.id}`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                            style={needsAction ? { background: '#003BFF', color: '#FFFFFF' } : { background: '#EFF6FF', color: '#003BFF' }}
                          >
                            {needsAction ? <Upload size={13} /> : <MessageSquare size={13} />}
                            {needsAction ? 'Submit Details' : 'Open Order'}
                          </Link>
                          {needsAction && (
                            <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#D97706' }}>
                              <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: '#D97706' }} />
                              ACTION NEEDED
                            </span>
                          )}
                        </div>
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