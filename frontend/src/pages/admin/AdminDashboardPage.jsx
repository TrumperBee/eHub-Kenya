import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, getCountFromServer } from 'firebase/firestore';
import axios from 'axios';
import toast from 'react-hot-toast';
import { db } from '../../services/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import PayoutsTab from './tabs/PayoutsTab';
import UsersTab from './tabs/UsersTab';
import AdminApplicationsPage from './AdminApplicationsPage';
import AdminListingsPage from './AdminListingsPage';
import AdminOrdersPage from './AdminOrdersPage';
import AdminDisputesPage from './AdminDisputesPage';
import AdminFridayDropsPage from './AdminFridayDropsPage';
import { BACKEND_URL } from '../../utils/constants';
import { formatKES } from '../../utils/formatters';
import { sellerPayout } from '../../utils/payouts';
import { useAuth } from '../../context/AuthContext';
import useOpenDisputeCount from '../../hooks/useOpenDisputeCount';
import {
  Banknote,
  Flame,
  Package,
  RefreshCw,
  Scale,
  ShoppingCart,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';

const TABS = [
  { id: 'payouts', label: 'Payouts', icon: Wallet },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'sellers', label: 'Sellers', icon: UserCheck },
  { id: 'listings', label: 'Listings', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'disputes', label: 'Disputes', icon: Scale },
  { id: 'drops', label: 'Friday Drops', icon: Flame },
];

const TAB_IDS = new Set(TABS.map((tab) => tab.id));

const CARD_STYLES = {
  blue: { background: '#EFF6FF', color: '#1D4ED8', bar: '#003BFF' },
  gold: { background: '#FFFBEB', color: '#B45309', bar: '#D4AF37' },
  green: { background: '#ECFDF5', color: '#047857', bar: '#16A34A' },
  purple: { background: '#F5F3FF', color: '#6D28D9', bar: '#7C3AED' },
};

function StatCard({ label, value, sub, icon, tone = 'blue' }) {
  const style = CARD_STYLES[tone] || CARD_STYLES.blue;
  return (
    <div
      className="bg-white border border-konami-mid-gray rounded-xl p-5"
      style={{ borderTopColor: style.bar, borderTopWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-konami-text-muted">{label}</p>
          <p className="font-heading text-2xl font-bold text-konami-text mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-konami-text-muted mt-1">{sub}</p>}
        </div>
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: style.background, color: style.color }}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { currentUser } = useAuth();
  const { count: openDisputes } = useOpenDisputeCount();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const tab = TAB_IDS.has(tabParam) ? tabParam : 'payouts';

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

  const [completedOrders, setCompletedOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [counts, setCounts] = useState({ users: 0, activeListings: 0 });
  const [countsLoading, setCountsLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  // Completed orders drive both the Total Sales card and the Payouts tab. One
  // live listener keeps them in step when a payout is marked as paid.
  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'completed'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCompletedOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setOrdersLoading(false);
      },
      (err) => {
        console.error('Completed orders subscription error:', err);
        setOrdersLoading(false);
      }
    );
    return unsub;
  }, []);

  const loadCounts = async () => {
    try {
      const [usersSnap, listingsSnap] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(query(collection(db, 'listings'), where('status', '==', 'active'))),
      ]);
      setCounts({
        users: usersSnap.data().count,
        activeListings: listingsSnap.data().count,
      });
    } catch (err) {
      console.error('Dashboard counts error:', err);
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function fetchCounts() {
      try {
        const [usersSnap, listingsSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'listings'), where('status', '==', 'active'))),
        ]);
        if (!active) return;
        setCounts({
          users: usersSnap.data().count,
          activeListings: listingsSnap.data().count,
        });
      } catch (err) {
        console.error('Dashboard counts error:', err);
      } finally {
        if (active) setCountsLoading(false);
      }
    }
    fetchCounts();
    return () => {
      active = false;
    };
  }, []);

  const refreshCounts = () => {
    setCountsLoading(true);
    loadCounts();
  };

  const handleReconcileStats = async () => {
    if (!currentUser) return;
    setReconciling(true);
    try {
      const idToken = await currentUser.getIdToken();
      const { data } = await axios.post(
        `${BACKEND_URL}/api/stats/reconcile`,
        {},
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      setCounts((prev) => ({
        ...prev,
        users: data?.stats?.totalUsers ?? prev.users,
        activeListings: data?.stats?.totalAccountsListed ?? prev.activeListings,
      }));
      toast.success('Homepage statistics recalculated from live data.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to recalculate stats');
    } finally {
      setReconciling(false);
    }
  };

  const totalSalesValue = completedOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
  const pendingPayoutOrders = completedOrders.filter((order) => order.sellerPaid !== true);
  const pendingPayoutValue = pendingPayoutOrders.reduce(
    (sum, order) => sum + sellerPayout(order.amount),
    0
  );

  const cards = [
    {
      label: 'Total Sales',
      value: ordersLoading ? '...' : `${completedOrders.length}`,
      sub: `${formatKES(totalSalesValue)} processed`,
      icon: <Banknote size={18} />,
      tone: 'blue',
    },
    {
      label: 'Pending Payouts',
      value: ordersLoading ? '...' : `${pendingPayoutOrders.length}`,
      sub: `${formatKES(pendingPayoutValue)} to send sellers`,
      icon: <Wallet size={18} />,
      tone: 'gold',
    },
    {
      label: 'Active Listings',
      value: countsLoading ? '...' : `${counts.activeListings}`,
      sub: 'Live on the marketplace',
      icon: <Package size={18} />,
      tone: 'green',
    },
    {
      label: 'Registered Users',
      value: countsLoading ? '...' : `${counts.users}`,
      sub: 'Buyers, sellers and admins',
      icon: <Users size={18} />,
      tone: 'purple',
    },
  ];

  const badgeFor = (id) => {
    if (id === 'payouts') return pendingPayoutOrders.length;
    if (id === 'disputes') return openDisputes || 0;
    return 0;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold text-konami-text">Command Center</h2>
            <p className="text-xs text-konami-text-muted mt-1">
              Live marketplace numbers and the actions that need your attention.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshCounts}
              disabled={countsLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-konami-mid-gray text-konami-text-dim hover:text-konami-text transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={countsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleReconcileStats}
              disabled={reconciling}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-60"
              style={{ borderColor: '#003BFF', color: '#003BFF' }}
            >
              <RefreshCw size={14} className={reconciling ? 'animate-spin' : ''} />
              {reconciling ? 'Recalculating...' : 'Recalculate Homepage Stats'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        <div className="bg-white border border-konami-mid-gray rounded-xl p-1.5 overflow-x-auto">
          <nav className="flex items-center gap-1 min-w-max" aria-label="Admin sections">
            {TABS.map((item) => {
              const Icon = item.icon;
              const badge = badgeFor(item.id);
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-konami-blue text-white'
                      : 'text-konami-text-muted hover:text-konami-text hover:bg-konami-light-gray'
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                  {badge > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-konami-red text-white'
                      }`}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <section>
          {tab === 'payouts' && (
            <PayoutsTab orders={completedOrders} loading={ordersLoading} />
          )}
          {tab === 'users' && <UsersTab />}
          {tab === 'sellers' && <AdminApplicationsPage embedded />}
          {tab === 'listings' && <AdminListingsPage embedded />}
          {tab === 'orders' && <AdminOrdersPage embedded />}
          {tab === 'disputes' && <AdminDisputesPage embedded />}
          {tab === 'drops' && <AdminFridayDropsPage embedded />}
        </section>
      </div>
    </AdminLayout>
  );
}
