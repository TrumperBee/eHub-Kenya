import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { Download, Loader2, TrendingUp, Wallet } from 'lucide-react';
import { db } from '../../../services/firebase';
import { formatKES } from '../../../utils/formatters';
import { canonicalStatus } from '../../../utils/orderMachine';
import { PLATFORM_FEE_RATE } from '../../../utils/payouts';
import {
  ANALYTICS_DAYS,
  STATUS_COLORS,
  buildCompletedOrdersCsv,
  buildRegistrationSeries,
  buildRevenueSeries,
  buildStatusBreakdown,
  buildTopSellers,
  totalCompletedValue,
  totalPlatformFees,
} from '../../../utils/analytics';

const DARK_CARD = 'bg-[#001450] border border-white/10';
const AXIS_TICK = { fill: '#9CA3AF', fontSize: 10 };

const TOOLTIP_PROPS = {
  contentStyle: {
    background: '#001450',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 10,
    color: '#FFFFFF',
    fontSize: 12,
  },
  labelStyle: { color: '#FFF100', fontWeight: 600 },
  itemStyle: { color: '#E5E7EB' },
  cursor: { fill: 'rgba(255,255,255,0.06)' },
};

const compactKES = (value) => {
  const n = Number(value) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
};

function ChartCard({ title, subtitle, children }) {
  return (
    <section className={`${DARK_CARD} rounded-xl p-4`}>
      <div className="mb-3">
        <h3 className="font-heading text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-[260px] w-full">{children}</div>
    </section>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-36 rounded-2xl border border-konami-mid-gray bg-white animate-pulse" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[320px] rounded-xl bg-[#001450]/80 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsTab() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        // Admin reads: firestore.rules allow admins to read every order and
        // user document. Both collections are read once per visit to the tab.
        const [ordersSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'users')),
        ]);
        if (!active) return;
        setOrders(ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setUsers(usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setError('');
      } catch (err) {
        console.error('Analytics data load error:', err);
        if (active) setError('Could not load analytics data. Check your admin access and try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const revenueSeries = useMemo(() => buildRevenueSeries(orders), [orders]);
  const registrationSeries = useMemo(() => buildRegistrationSeries(users), [users]);
  const statusData = useMemo(() => buildStatusBreakdown(orders), [orders]);
  const topSellers = useMemo(() => buildTopSellers(orders, 5), [orders]);

  const feesCollected = useMemo(() => totalPlatformFees(orders), [orders]);
  const completedValue = useMemo(() => totalCompletedValue(orders), [orders]);
  const completedCount = useMemo(
    () => orders.filter((order) => canonicalStatus(order.status) === 'completed').length,
    [orders]
  );

  const feePercent = Math.round(PLATFORM_FEE_RATE * 100);

  const retry = () => {
    setLoading(true);
    setError('');
    setReloadKey((key) => key + 1);
  };

  const handleExport = () => {
    if (!completedCount) {
      toast.error('There are no completed orders to export yet.');
      return;
    }
    const csv = buildCompletedOrdersCsv(orders);
    // BOM keeps Excel from mangling UTF-8 characters in buyer/seller ids.
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ehub-completed-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${completedCount} completed orders.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-konami-text">Analytics</h3>
          <p className="text-xs text-konami-text-muted mt-0.5">
            Revenue, order flow and marketplace growth over the last {ANALYTICS_DAYS} days.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading || completedCount === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FFF100] px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-[#001450] transition-colors hover:bg-yellow-300 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export Report
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 text-xs font-bold uppercase tracking-wide text-red-700 underline"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <ChartSkeleton />
      ) : (
        <>
          <section className={`${DARK_CARD} relative overflow-hidden rounded-2xl p-6`}>
            <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#003BFF]/40 blur-2xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FFF100]">
                  Platform fees collected
                </p>
                <p className="mt-2 font-heading text-3xl sm:text-4xl font-extrabold text-white">
                  {formatKES(feesCollected)}
                </p>
                <p className="mt-2 text-xs text-white/60">
                  {feePercent}% of {formatKES(completedValue)} across {completedCount} completed orders
                  {feePercent === 0 ? ' · fee holiday active' : ''}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#FFF100]">
                <Wallet size={20} />
              </span>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Revenue" subtitle={`Completed order value · last ${ANALYTICS_DAYS} days`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#FFFFFF12" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickFormatter={compactKES}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    {...TOOLTIP_PROPS}
                    formatter={(value) => [formatKES(value), 'Revenue']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4D82FF"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#FFF100', stroke: '#001450', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Orders by status" subtitle="All orders, all time">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusData}
                  layout="vertical"
                  margin={{ top: 4, right: 26, bottom: 4, left: 4 }}
                >
                  <CartesianGrid stroke="#FFFFFF12" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={118}
                    tick={{ ...AXIS_TICK, fill: '#D1D5DB' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip {...TOOLTIP_PROPS} formatter={(value) => [value, 'Orders']} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#4D82FF'} />
                    ))}
                    <LabelList dataKey="count" position="right" fill="#E5E7EB" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="New registrations" subtitle={`Sign-ups per day · last ${ANALYTICS_DAYS} days`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={registrationSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#FFFFFF12" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    {...TOOLTIP_PROPS}
                    formatter={(value) => [value, 'Registrations']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#FFF100"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#4D82FF', stroke: '#001450', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top sellers" subtitle="By completed orders">
              {topSellers.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-white/50">
                  No completed orders yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSellers}
                    layout="vertical"
                    margin={{ top: 4, right: 30, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid stroke="#FFFFFF12" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={118}
                      tick={{ ...AXIS_TICK, fill: '#D1D5DB' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) => [value, 'Completed orders']}
                    />
                    <Bar dataKey="orders" fill="#003BFF" radius={[0, 6, 6, 0]} maxBarSize={18}>
                      <LabelList dataKey="orders" position="right" fill="#E5E7EB" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-konami-text-muted">
            <TrendingUp size={12} />
            Charts read live Firestore data when this tab opens. Export includes every completed order,
            not just the last {ANALYTICS_DAYS} days.
          </p>
        </>
      )}
    </div>
  );
}
