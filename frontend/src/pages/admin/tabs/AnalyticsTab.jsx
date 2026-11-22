import { useEffect, useMemo, useRef, useState } from 'react';
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
import html2canvas from 'html2canvas';
import { Copy, Download, Image as ImageIcon, Loader2, TrendingUp, Wallet } from 'lucide-react';
import { db } from '../../../services/firebase';
import { formatKES } from '../../../utils/formatters';
import { canonicalStatus } from '../../../utils/orderMachine';
import { PLATFORM_FEE_RATE } from '../../../utils/payouts';
import {
  ANALYTICS_FOOTER_HEIGHT,
  ANALYTICS_IMAGE_SIZE,
  analyticsFooterDate,
  analyticsImageFileName,
  analyticsImageLayout,
} from '../../../utils/analyticsImage';
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
  const [exportingImage, setExportingImage] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const reportRef = useRef(null);

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

  // Capture the analytics cards/charts, then compose a shareable 1080x1080
  // image with a branded footer. Built as a canvas so the size is exact.
  const buildAnalyticsImage = async () => {
    const element = reportRef.current;
    if (!element) return null;

    // Web fonts must be ready before canvas text is drawn or the footer falls
    // back to a system font in the exported PNG.
    if (document.fonts?.ready) await document.fonts.ready;

    const scale = Math.min(3, Math.max(2, ANALYTICS_IMAGE_SIZE / Math.max(element.scrollWidth, 1)));
    const captured = await html2canvas(element, {
      backgroundColor: '#F4F5F7',
      scale,
      useCORS: true,
      logging: false,
    });

    const canvas = document.createElement('canvas');
    canvas.width = ANALYTICS_IMAGE_SIZE;
    canvas.height = ANALYTICS_IMAGE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.fillStyle = '#F4F5F7';
    ctx.fillRect(0, 0, ANALYTICS_IMAGE_SIZE, ANALYTICS_IMAGE_SIZE);

    const image = analyticsImageLayout(captured.width, captured.height);
    ctx.drawImage(captured, image.x, image.y, image.width, image.height);

    const footerY = ANALYTICS_IMAGE_SIZE - ANALYTICS_FOOTER_HEIGHT;
    ctx.fillStyle = '#001450';
    ctx.fillRect(0, footerY, ANALYTICS_IMAGE_SIZE, ANALYTICS_FOOTER_HEIGHT);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 34px Montserrat, Inter, sans-serif';
    ctx.fillText('eHub Market Analytics', 48, footerY + 52);
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText('ehubmarket.me', 48, footerY + 84);

    const dateText = analyticsFooterDate();
    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillText(dateText, ANALYTICS_IMAGE_SIZE - 48 - ctx.measureText(dateText).width, footerY + 54);

    return canvas;
  };

  const handleExportImage = async () => {
    setExportingImage(true);
    try {
      const canvas = await buildAnalyticsImage();
      if (!canvas) {
        toast.error('Analytics are not ready to export yet.');
        return;
      }
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = analyticsImageFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Analytics image downloaded.');
    } catch (err) {
      console.error('Analytics image export failed:', err);
      toast.error('Could not create the analytics image. Please try again.');
    } finally {
      setExportingImage(false);
    }
  };

  const handleCopyImage = async () => {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      toast.error('Copying images is not supported here. Use Export as Image instead.');
      return;
    }
    setCopyingImage(true);
    try {
      const canvas = await buildAnalyticsImage();
      if (!canvas) {
        toast.error('Analytics are not ready to copy yet.');
        return;
      }
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not encode the analytics image');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.success('Analytics image copied — paste it into WhatsApp.');
    } catch (err) {
      console.error('Analytics image copy failed:', err);
      toast.error('Could not copy the image. Use Export as Image instead.');
    } finally {
      setCopyingImage(false);
    }
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || completedCount === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FFF100] px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-[#001450] transition-colors hover:bg-yellow-300 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportImage}
            disabled={loading || !!error || exportingImage || copyingImage}
            className="inline-flex items-center gap-2 rounded-lg bg-[#001450] px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#00236b] disabled:opacity-50"
          >
            {exportingImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
            Export as Image
          </button>
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={loading || !!error || exportingImage || copyingImage}
            className="inline-flex items-center gap-2 rounded-lg border border-[#001450]/25 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-[#001450] transition-colors hover:bg-[#F4F5F7] disabled:opacity-50"
          >
            {copyingImage ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            Copy Image
          </button>
        </div>
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
        <div ref={reportRef} className="space-y-5">
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
        </div>
      )}
    </div>
  );
}
