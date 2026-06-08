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
    return <div className="pt-16 min-h-screen bg-[#0D0D0D] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
    </div>;
  }

  return (
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="section-heading mb-6">Earnings</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Earned', value: formatKES(totalEarned), icon: Wallet, color: '#22C55E' },
            { label: 'Pending (Escrow)', value: formatKES(pendingAmount), icon: Clock, color: '#D4AF37' },
            { label: 'This Month', value: formatKES(thisMonthTotal), icon: TrendingUp, color: '#BF0021' },
            { label: 'M-Pesa Fee Paid', value: formatKES(mpesaFee), icon: Percent, color: '#9E9E9E' },
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

        {completedOrders.length === 0 ? (
          <div className="card p-8 text-center">
            <Wallet size={40} className="mx-auto mb-3 text-[#5C5C5C]" />
            <p className="text-[#9E9E9E]">No completed sales yet.</p>
          </div>
        ) : (
          <div className="card">
            <div className="p-5 border-b border-[#2A2A2A]">
              <h3 className="font-heading text-lg font-bold text-white">Completed Sales</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Date</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Listing</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Amount</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">M-Pesa Fee</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">Net Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {completedOrders.map((order) => {
                    const fee = Math.round((order.amount || 0) * 0.005);
                    const net = (order.amount || 0) - fee;
                    return (
                      <tr key={order.id} className="hover:bg-[#242424] transition-colors">
                        <td className="px-5 py-3 text-sm text-[#9E9E9E]">{formatDate(order.createdAt)}</td>
                        <td className="px-5 py-3 text-sm text-white max-w-[200px] truncate">{order.listingTitle}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-white">{formatKES(order.amount)}</td>
                        <td className="px-5 py-3 text-sm text-[#5C5C5C]">{formatKES(fee)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-green-400">{formatKES(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-[#242424] rounded-xl border border-[#2A2A2A]">
          <p className="text-xs text-[#9E9E9E]">
            Payments are released to your M-Pesa number after buyer confirms receipt. Contact admin if you have payout issues.
          </p>
        </div>
      </div>
    </div>
  );
}
