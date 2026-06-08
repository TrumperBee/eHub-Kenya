import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Clock, Percent } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSellerOrders } from '../../services/ordersService';
import { formatKES, formatDate } from '../../utils/formatters';

export default function SellerEarningsPage() {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);
    getSellerOrders(userProfile.uid).then(setOrders).finally(() => setLoading(false));
  }, [userProfile]);

  const completedOrders = orders.filter(o => o.status === 'completed');
  const pendingOrders = orders.filter(o => ['payment_confirmed', 'in_transfer'].includes(o.status));
  const totalEarned = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const pendingAmount = pendingOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  const thisMonth = completedOrders.filter(o => {
    if (!o.createdAt) return false;
    const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonth.reduce((sum, o) => sum + (o.amount || 0), 0);

  const mpesaFee = Math.round(totalEarned * 0.005);

  if (loading) {
    return <div className="pt-16 min-h-screen bg-konami-light-gray flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
    </div>;
  }

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-extrabold text-konami-text mb-6">Earnings</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Earned', value: formatKES(totalEarned), icon: Wallet, color: '#22C55E' },
            { label: 'Pending (Escrow)', value: formatKES(pendingAmount), icon: Clock, color: '#D4AF37' },
            { label: 'This Month', value: formatKES(thisMonthTotal), icon: TrendingUp, color: '#003BFF' },
            { label: 'M-Pesa Fee Paid', value: formatKES(mpesaFee), icon: Percent, color: '#6B7280' },
          ].map((stat, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-konami-text-muted">{stat.label}</p>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <p className="font-heading text-xl font-bold text-konami-text">{stat.value}</p>
            </div>
          ))}
        </div>

        {completedOrders.length === 0 ? (
          <div className="card p-8 text-center">
            <Wallet size={40} className="mx-auto mb-3 text-konami-text-muted" />
            <p className="text-konami-text-dim">No completed sales yet.</p>
          </div>
        ) : (
          <div className="card">
            <div className="p-5 border-b border-konami-mid-gray">
              <h3 className="font-heading text-lg font-bold text-konami-text">Completed Sales</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-konami-mid-gray text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Date</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Listing</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Amount</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">M-Pesa Fee</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-konami-text-muted">Net Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-konami-mid-gray">
                  {completedOrders.map((order) => {
                    const fee = Math.round((order.amount || 0) * 0.005);
                    const net = (order.amount || 0) - fee;
                    return (
                      <tr key={order.id} className="hover:bg-konami-light-gray transition-colors">
                        <td className="px-5 py-3 text-sm text-konami-text-dim">{formatDate(order.createdAt)}</td>
                        <td className="px-5 py-3 text-sm text-konami-text max-w-[200px] truncate">{order.listingTitle}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-konami-text">{formatKES(order.amount)}</td>
                        <td className="px-5 py-3 text-sm text-konami-text-muted">{formatKES(fee)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-green-500">{formatKES(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-konami-light-gray rounded-xl border border-konami-mid-gray">
          <p className="text-xs text-konami-text-muted">
            Payments are released to your M-Pesa number after buyer confirms receipt. Contact admin if you have payout issues.
          </p>
        </div>
      </div>
    </div>
  );
}
