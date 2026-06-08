import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, Clock, Percent, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSellerOrders } from '../../services/ordersService';
import { formatKES, formatDate } from '../../utils/formatters';

function calcFee(amount) {
  return Math.min(Math.round((amount || 0) * 0.005), 200);
}

function EarningsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-20 mb-1" />
            <div className="h-3 bg-gray-200 rounded w-28" />
          </div>
        ))}
      </div>
      <div className="h-24 bg-green-50 rounded-xl" />
    </div>
  );
}

function EarningsError({ onRetry }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ background: '#FEF2F2', border: '1px solid #C8102E' }}>
      <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#C8102E' }} />
      <p className="text-sm font-medium mb-2" style={{ color: '#111' }}>Could not load your earnings</p>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Check your connection and try again.</p>
      <button onClick={onRetry} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: '#003BFF', color: '#003BFF' }}>
        RETRY
      </button>
    </div>
  );
}

export default function SellerEarningsPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSellerOrders(userProfile.uid);
      setOrders(data);
    } catch (err) {
      console.error('Earnings fetch error:', err);
      setError('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const completedOrders = orders.filter(o => o.status === 'completed');
  const pendingEscrowOrders = orders.filter(o => ['payment_confirmed', 'in_transfer'].includes(o.status));

  const totalEarned = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const pendingEscrow = pendingEscrowOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalFees = completedOrders.reduce((sum, o) => sum + calcFee(o.amount), 0);

  const now = new Date();
  const thisMonthEarned = completedOrders
    .filter(o => {
      if (!o.createdAt) return false;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  if (loading) {
    return (
      <div className="pt-[68px] min-h-screen" style={{ background: '#F5F5F5' }}>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <EarningsSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-[68px] min-h-screen" style={{ background: '#F5F5F5' }}>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <EarningsError onRetry={fetchData} />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[68px] min-h-screen" style={{ background: '#F5F5F5' }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-heading text-2xl font-extrabold mb-6" style={{ color: '#111' }}>EARNINGS</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 relative overflow-hidden">
            <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
            <p className="font-heading text-3xl font-extrabold mb-1" style={{ color: '#003BFF' }}>{formatKES(totalEarned)}</p>
            <p className="text-sm font-medium" style={{ color: '#111' }}>Total Earned</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp size={12} style={{ color: '#22C55E' }} />
              <span className="text-xs" style={{ color: '#6B7280' }}>All time</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 relative overflow-hidden">
            <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
            <p className="font-heading text-3xl font-extrabold mb-1" style={{ color: '#003BFF' }}>{formatKES(thisMonthEarned)}</p>
            <p className="text-sm font-medium" style={{ color: '#111' }}>Earned This Month</p>
            <div className="flex items-center gap-1 mt-1">
              <Wallet size={12} style={{ color: '#003BFF' }} />
              <span className="text-xs" style={{ color: '#6B7280' }}>{now.toLocaleString('default', { month: 'long' })}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 relative overflow-hidden">
            <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
            <p className="font-heading text-3xl font-extrabold mb-1" style={{ color: '#D97706' }}>{formatKES(pendingEscrow)}</p>
            <p className="text-sm font-medium" style={{ color: '#111' }}>Pending Escrow</p>
            <div className="flex items-center gap-1 mt-1">
              <Clock size={12} style={{ color: '#D97706' }} />
              <span className="text-xs" style={{ color: '#6B7280' }}>Awaiting buyer confirmation</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 relative overflow-hidden">
            <div style={{ height: 4, background: '#003BFF', position: 'absolute', top: 0, left: 0, right: 0 }} />
            <p className="font-heading text-3xl font-extrabold mb-1" style={{ color: '#6B7280' }}>{formatKES(totalFees)}</p>
            <p className="text-sm font-medium" style={{ color: '#111' }}>Platform Fees Paid</p>
            <div className="flex items-center gap-1 mt-1">
              <Percent size={12} style={{ color: '#6B7280' }} />
              <span className="text-xs" style={{ color: '#6B7280' }}>0.5% per sale, max KES 200</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5 mb-6" style={{ background: '#F0FDF4', borderLeft: '4px solid #22C55E' }}>
          <h3 className="font-heading text-xs font-bold uppercase mb-2" style={{ color: '#15803D' }}>💳 HOW PAYOUTS WORK</h3>
          <div className="text-sm leading-relaxed space-y-1" style={{ color: '#374151' }}>
            <p>Payments are processed through M-Pesa escrow:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>When a buyer pays, funds are held securely in escrow.</li>
              <li>Once you transfer the account and the buyer confirms receipt, the funds are released to your M-Pesa number within minutes.</li>
              <li>The M-Pesa transaction fee (0.5%, max KES 200) is deducted from each payout automatically.</li>
              <li>If there is a dispute, funds remain frozen until the admin resolves it.</li>
            </ol>
            <p className="mt-2">
              Your registered M-Pesa number: <strong>{userProfile?.phoneNumber || 'Not set — update in Profile'}</strong>
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>If your number is wrong, update it in your Profile tab before your next sale.</p>
          </div>
        </div>

        {completedOrders.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">💰</span>
            <h3 className="font-heading text-xl font-extrabold mb-2" style={{ color: '#003BFF' }}>NO EARNINGS YET</h3>
            <p className="text-sm max-w-md mx-auto mb-6" style={{ color: '#6B7280' }}>
              Complete your first sale to see your earnings here. Create a listing and wait for buyers — it's that simple.
            </p>
            <button onClick={() => navigate('/transfer-room/new')} className="btn-primary text-sm" style={{ background: '#FFF100', color: '#111' }}>
              CREATE A LISTING
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-heading text-base font-bold" style={{ color: '#111' }}>Completed Sales</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Date</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Listing</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Sale Price</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Fee Deducted</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Net Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {completedOrders.map((order) => {
                    const fee = calcFee(order.amount);
                    const net = (order.amount || 0) - fee;
                    return (
                      <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-5 py-3 text-sm" style={{ color: '#6B7280' }}>{formatDate(order.createdAt)}</td>
                        <td className="px-5 py-3 text-sm font-medium max-w-[200px] truncate" style={{ color: '#111' }}>{order.listingTitle || 'Untitled'}</td>
                        <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#111' }}>{formatKES(order.amount)}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: '#6B7280' }}>{formatKES(fee)}</td>
                        <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#22C55E' }}>{formatKES(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
