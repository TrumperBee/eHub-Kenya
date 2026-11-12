import TableSkeleton from '../../../components/admin/TableSkeleton';
import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import toast from 'react-hot-toast';
import { formatKES, formatDate } from '../../../utils/formatters';
import { PLATFORM_FEE_RATE, platformFee, sellerPayout, completedAtMs } from '../../../utils/payouts';
import { Banknote, CheckCircle2, Info, Loader2, Phone, Wallet } from 'lucide-react';

const sellerNameOf = (order, profile) =>
  order.sellerDisplayName || profile?.sellerDisplayName || profile?.displayName || '-';

const buyerNameOf = (order, profile) =>
  order.buyerDisplayName || profile?.displayName || '-';

const phoneOf = (profile) => profile?.sellerWhatsapp || profile?.phoneNumber || '';

function Stat({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'text-konami-blue',
    gold: 'text-konami-gold',
    green: 'text-green-600',
  };
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-konami-text-muted">{label}</p>
      <p className={`font-heading text-lg font-bold ${tones[tone] || tones.blue}`}>{value}</p>
    </div>
  );
}

export default function PayoutsTab({ orders = [], loading = false }) {
  const [profiles, setProfiles] = useState({});
  const [payingId, setPayingId] = useState(null);
  const requested = useRef(new Set());

  const pendingOrders = orders
    .filter((order) => order.sellerPaid !== true)
    .sort((a, b) => completedAtMs(a) - completedAtMs(b));

  // Pull the buyer/seller profiles once per uid so the table can show real
  // names and the seller's payout phone number.
  useEffect(() => {
    const ids = new Set();
    pendingOrders.forEach((order) => {
      if (order.sellerId) ids.add(order.sellerId);
      if (order.buyerId) ids.add(order.buyerId);
    });
    const missing = [...ids].filter((id) => !requested.current.has(id));
    if (missing.length === 0) return undefined;

    let active = true;
    missing.forEach((id) => requested.current.add(id));

    Promise.all(
      missing.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          return [id, snap.exists() ? snap.data() : {}];
        } catch {
          return [id, {}];
        }
      })
    ).then((entries) => {
      if (active) setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });

    return () => {
      active = false;
    };
  }, [pendingOrders]);

  const totalPending = pendingOrders.reduce(
    (sum, order) => sum + sellerPayout(order.amount),
    0
  );
  const sellerCount = new Set(pendingOrders.map((order) => order.sellerId).filter(Boolean)).size;

  const handleMarkPaid = async (order) => {
    setPayingId(order.id);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        sellerPaid: true,
        sellerPaidAt: serverTimestamp(),
        sellerPaidBy: 'admin',
        updatedAt: serverTimestamp(),
      });
      const profile = profiles[order.sellerId];
      toast.success(
        `Marked ${formatKES(sellerPayout(order.amount))} to ${sellerNameOf(order, profile)} as paid.`
      );
    } catch (err) {
      console.error('Mark seller paid error:', err);
      toast.error('Failed to mark this order as paid');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4">
        <div className="bg-white border border-konami-mid-gray rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-konami-text-muted">
                Total pending payouts
              </p>
              <p className="font-heading text-3xl font-bold text-konami-text mt-1">
                {formatKES(totalPending)}
              </p>
              <p className="text-xs text-konami-text-muted mt-1">
                {pendingOrders.length} completed {pendingOrders.length === 1 ? 'sale' : 'sales'} waiting
                {sellerCount > 0 ? ` across ${sellerCount} ${sellerCount === 1 ? 'seller' : 'sellers'}` : ''}.
              </p>
            </div>
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#ECFDF5', color: '#047857' }}
            >
              <Wallet size={20} />
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-konami-mid-gray">
            <Stat label="Sale value" value={formatKES(pendingOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0))} />
            <Stat
              label={`Platform fee (${Math.round(PLATFORM_FEE_RATE * 100)}%)`}
              value={formatKES(pendingOrders.reduce((s, o) => s + platformFee(o.amount), 0))}
              tone="gold"
            />
            <Stat label="To send sellers" value={formatKES(totalPending)} tone="green" />
          </div>
        </div>

        <div className="rounded-xl p-5 flex gap-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <Info size={18} className="shrink-0 mt-0.5" style={{ color: '#B45309' }} />
          <p className="text-sm leading-relaxed" style={{ color: '#92400E' }}>
            <span className="font-semibold">Platform fee is 5% of each sale.</span> This covers ZetuPay
            transaction tokens and platform maintenance. Deduct before sending to seller.
          </p>
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : pendingOrders.length === 0 ? (
        <div className="bg-white border border-konami-mid-gray rounded-xl text-center py-14">
          <CheckCircle2 size={38} className="mx-auto mb-3 text-green-600" />
          <p className="text-sm font-semibold text-konami-text">All settled</p>
          <p className="text-xs text-konami-text-muted mt-1">
            Every completed sale has been paid out to the seller.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-konami-mid-gray rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1120px]">
              <thead>
                <tr className="bg-konami-light-gray text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap">Date completed</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Listing title</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Buyer</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted">Seller</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap">Seller phone</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap text-right">Sale amount</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap text-right">Fee 5%</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-konami-text-muted whitespace-nowrap text-right">Send seller</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-konami-mid-gray">
                {pendingOrders.map((order) => {
                  const sellerProfile = profiles[order.sellerId];
                  const buyerProfile = profiles[order.buyerId];
                  const phone = phoneOf(sellerProfile) || order.sellerPhone || '';
                  const fee = platformFee(order.amount);
                  const payout = sellerPayout(order.amount);
                  const isPaying = payingId === order.id;

                  return (
                    <tr key={order.id} className="hover:bg-konami-light-gray/60 transition-colors align-top">
                      <td className="px-4 py-3 text-konami-text-dim whitespace-nowrap">
                        {formatDate(order.completedAt || order.resolvedAt || order.updatedAt || order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-konami-text max-w-[220px]">
                        <p className="truncate">{order.listingTitle || '-'}</p>
                        <p className="text-[11px] font-mono text-konami-text-muted mt-0.5">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-konami-text">{buyerNameOf(order, buyerProfile)}</td>
                      <td className="px-4 py-3 text-konami-text">{sellerNameOf(order, sellerProfile)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {phone ? (
                          <a
                            href={`tel:${phone.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1.5 text-konami-blue hover:underline"
                          >
                            <Phone size={12} /> {phone}
                          </a>
                        ) : (
                          <span className="text-xs text-konami-text-muted">Not on profile</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-konami-text whitespace-nowrap">
                        {formatKES(order.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-konami-gold font-semibold whitespace-nowrap">
                        -{formatKES(fee)}
                      </td>
                      <td className="px-4 py-3 text-right font-heading font-bold text-green-700 whitespace-nowrap">
                        {formatKES(payout)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleMarkPaid(order)}
                          disabled={isPaying}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-lg text-white transition-colors disabled:opacity-60 whitespace-nowrap"
                          style={{ background: '#16A34A' }}
                        >
                          {isPaying ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Banknote size={13} />
                          )}
                          {isPaying ? 'Saving' : 'Mark as Paid'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-konami-text-muted">
        Payouts stay manual: send the “Send seller” amount to the phone number shown, then mark it paid
        here. ZetuPay transaction tokens are covered by the 5% platform fee.
      </p>
    </div>
  );
}
