import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, getCountFromServer, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { getPendingApplications } from '../../services/usersService';
import { ORDER_STATUS } from '../../utils/constants';
import { formatKES, formatDate } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import { Users, ShoppingBag, FileText, DollarSign, Clock, AlertTriangle } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingApps: 0,
    activeDisputes: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersSnap, listingsSnap, ordersSnap, disputesSnap, apps] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'listings'), where('status', '==', 'active'))),
          getCountFromServer(collection(db, 'orders')),
          getCountFromServer(query(collection(db, 'orders'), where('status', '==', 'disputed'))),
          getPendingApplications(),
        ]);

        const ordersQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(10));
        const ordersSnap2 = await getDocs(ordersQ);
        const orders = ordersSnap2.docs.map(d => ({ id: d.id, ...d.data() }));
        setRecentOrders(orders);

        const completedOrders = orders.filter(o => o.status === 'completed');
        const totalRev = completedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

        const appsSnap = await getDocs(query(collection(db, 'sellerApplications'), orderBy('submittedAt', 'desc'), limit(5)));
        setRecentApps(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        setStats({
          totalUsers: usersSnap.data().count,
          activeListings: listingsSnap.data().count,
          totalOrders: ordersSnap.data().count,
          totalRevenue: totalRev,
          pendingApps: apps.length,
          activeDisputes: disputesSnap.data().count,
        });
      } catch (err) {
        console.error('Dashboard stats error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const metricCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={18} />, color: '#3B82F6' },
    { label: 'Active Listings', value: stats.activeListings, icon: <ShoppingBag size={18} />, color: '#10B981' },
    { label: 'Total Orders', value: stats.totalOrders, icon: <FileText size={18} />, color: '#8B5CF6' },
    { label: 'Revenue Processed', value: formatKES(stats.totalRevenue), icon: <DollarSign size={18} />, color: '#D4AF37' },
    { label: 'Pending Applications', value: stats.pendingApps, icon: <Clock size={18} />, color: '#F59E0B', badge: stats.pendingApps > 0 },
    { label: 'Active Disputes', value: stats.activeDisputes, icon: <AlertTriangle size={18} />, color: '#EF4444', badge: stats.activeDisputes > 0 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="font-heading text-xl font-bold text-konami-text">Overview</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricCards.map((card) => (
            <div key={card.label} className="bg-white border border-konami-mid-gray rounded-xl p-5" style={{ borderTopColor: card.color, borderTopWidth: 2 }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-konami-text-muted uppercase tracking-wider">{card.label}</span>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <p className="font-heading text-2xl font-bold text-konami-text">
                {card.value}
                {card.badge && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-konami-red text-white">
                    {card.label === 'Pending Applications' ? stats.pendingApps : stats.activeDisputes}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-konami-mid-gray rounded-xl p-5">
            <h3 className="font-heading text-sm font-bold text-konami-text mb-4">Recent Orders</h3>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-konami-text-muted">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => {
                  const cfg = ORDER_STATUS[order.status] || {};
                  return (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-konami-mid-gray last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-konami-text truncate">{order.listingTitle || '—'}</p>
                        <p className="text-xs text-konami-text-muted">{formatKES(order.amount)}</p>
                      </div>
                      <span className={`text-xs ${cfg.color || 'text-konami-text-dim'} shrink-0 ml-2`}>
                        {cfg.label || order.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-konami-mid-gray rounded-xl p-5">
            <h3 className="font-heading text-sm font-bold text-konami-text mb-4">Recent Applications</h3>
            {recentApps.length === 0 ? (
              <p className="text-sm text-konami-text-muted">No applications yet.</p>
            ) : (
              <div className="space-y-2">
                {recentApps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between py-2 border-b border-konami-mid-gray last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-konami-text truncate">{app.desiredSellerName || app.displayName || '—'}</p>
                      <p className="text-xs text-konami-text-muted">{app.email}</p>
                    </div>
                    <span className={`text-xs shrink-0 ml-2 ${
                      app.status === 'pending' ? 'text-amber-500' :
                      app.status === 'approved' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
                <Link to={`/hub-command-af29x/applications`} className="block text-xs text-konami-blue hover:underline mt-2 text-center">
                  View All Applications →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
