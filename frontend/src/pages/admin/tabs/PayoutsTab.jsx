import TableSkeleton from '../../../components/admin/TableSkeleton';
import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { getUserContact, mergeContactIntoProfile } from '../../../services/userContactService';
import { markSellerPayoutPaid } from '../../../services/adminOrderService';
import toast from 'react-hot-toast';
import { formatKES, formatDate } from '../../../utils/formatters';
import { PLATFORM_FEE_RATE, platformFee, sellerPayout, completedAtMs } from '../../../utils/payouts';
import {
  buildAdminSellerChatUrl,
  formatMpesaNumber,
  payoutPhoneOf,
  sellerChatPhoneOf,
  sellerDisplayNameOf,
  sellerUsernameOf,
} from '../../../utils/payoutContact';
import { Banknote, CheckCircle2, Copy, Info, Loader2, MessageCircle, Wallet } from 'lucide-react';

const buyerNameOf = (order, profile) =>
  order.buyerDisplayName || profile?.displayName || profile?.username || '-';

function Stat({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'text-konami-blue',
    gold: 'text-konami-gold',
    green: 'text-green-600',
  };
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-konami-text-muted leading-snug">
        {label}
      </p>
      <p className={`font-heading text-lg sm:text-xl font-bold mt-0.5 break-words ${tones[tone] || tones.blue}`}>
        {value}
      </p>
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

  // Pull the buyer/seller profiles once per uid so each payout card can show
  // the real name and the seller's M-Pesa number.
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
          // SECURITY: payout phone lives in the owner/admin-only private
          // contact document, so it is fetched separately and merged here.
          const [snap, contact] = await Promise.all([
            getDoc(doc(db, 'users', id)),
            getUserContact(id),
          ]);
          return [id, mergeContactIntoProfile(snap.exists() ? snap.data() : {}, contact)];
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
      // SECURITY: order writes are backend-only (Admin SDK); the browser can
      // no longer set sellerPaid directly.
      await markSellerPayoutPaid(order.id);
      const profile = profiles[order.sellerId];
      toast.success(
        `Marked ${formatKES(sellerPayout(order.amount))} to ${sellerDisplayNameOf(order, profile)} as paid.`
      );
    } catch (err) {
      console.error('Mark seller paid error:', err);
      toast.error('Failed to mark this order as paid');
    } finally {
      setPayingId(null);
    }
  };

  const handleCopyNumber = async (phone) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(String(phone).replace(/\s+/g, ''));
      toast.success('M-Pesa number copied to clipboard');
    } catch {
      toast.error('Could not copy automatically — long-press the number to copy it.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="bg-white border border-konami-mid-gray rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-konami-text-muted">
                Total pending payouts
              </p>
              <p className="font-heading text-3xl font-bold text-konami-text mt-1 break-words">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5 pt-4 border-t border-konami-mid-gray">
            <Stat label="Sale value" value={formatKES(pendingOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0))} />
            <Stat
              label={PLATFORM_FEE_RATE > 0 ? `Platform fee (${Math.round(PLATFORM_FEE_RATE * 100)}%)` : 'Platform fee'}
              value={formatKES(pendingOrders.reduce((s, o) => s + platformFee(o.amount), 0))}
              tone="gold"
            />
            <Stat label="To send sellers" value={formatKES(totalPending)} tone="green" />
          </div>
        </div>

        <div className="rounded-xl p-5 flex gap-3 h-full" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <Info size={18} className="shrink-0 mt-0.5" style={{ color: '#B45309' }} />
          <p className="text-sm leading-relaxed" style={{ color: '#92400E' }}>
            {PLATFORM_FEE_RATE > 0 ? (
              <>
                <span className="font-semibold">Platform fee is {Math.round(PLATFORM_FEE_RATE * 100)}% of each sale.</span>{' '}
                This covers ZetuPay transaction tokens and platform maintenance. Deduct before sending
                to seller.
              </>
            ) : (
              <>
                <span className="font-semibold">No platform fee is deducted right now.</span>{' '}
                Send the full sale amount to the seller.
              </>
            )}
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
        <div className="space-y-4">
          {pendingOrders.map((order) => {
            const sellerProfile = profiles[order.sellerId];
            const buyerProfile = profiles[order.buyerId];
            const mpesaPhone = payoutPhoneOf(order, sellerProfile);
            const sellerName = sellerDisplayNameOf(order, sellerProfile);
            const username = sellerUsernameOf(sellerProfile);
            const chatUrl = buildAdminSellerChatUrl({
              phone: sellerChatPhoneOf(order, sellerProfile),
              orderId: order.id,
            });
            const fee = platformFee(order.amount);
            const payout = sellerPayout(order.amount);
            const isPaying = payingId === order.id;

            return (
              <article key={order.id} className="rounded-xl border border-konami-mid-gray bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-konami-mid-gray pb-3">
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-bold text-konami-text break-words">
                      {order.listingTitle || 'Listing'}
                    </p>
                    <p className="text-[11px] font-mono text-konami-text-muted mt-0.5">
                      #{String(order.id).slice(0, 8).toUpperCase()} ·{' '}
                      {formatDate(order.completedAt || order.resolvedAt || order.updatedAt || order.createdAt)}
                    </p>
                  </div>
                  <p className="text-xs text-konami-text-muted">
                    Buyer:{' '}
                    <span className="font-semibold text-konami-text-dim">
                      {buyerNameOf(order, buyerProfile)}
                    </span>
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section className="rounded-lg bg-konami-light-gray/60 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-konami-text-muted">
                      Seller · M-Pesa payout
                    </p>
                    <p className="font-heading text-lg font-bold text-konami-text mt-1 break-words">
                      {sellerName}
                    </p>
                    {username && username !== sellerName && (
                      <p className="text-xs text-konami-text-muted">{username}</p>
                    )}

                    <p className="text-[11px] font-semibold uppercase tracking-wider text-konami-text-muted mt-4">
                      M-Pesa number
                    </p>
                    <p className="font-heading text-2xl sm:text-3xl font-extrabold tracking-wide text-konami-blue break-words mt-0.5">
                      {mpesaPhone ? formatMpesaNumber(mpesaPhone) : 'Not on profile'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyNumber(mpesaPhone)}
                        disabled={!mpesaPhone}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-konami-blue/30 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-konami-blue transition-colors hover:bg-konami-blue/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Copy size={13} /> Copy Number
                      </button>
                      {chatUrl ? (
                        <a
                          href={chatUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:opacity-90"
                          style={{ background: '#25D366' }}
                        >
                          <MessageCircle size={13} /> Chat with Seller
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="No usable phone number on this seller's profile"
                          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-konami-mid-gray px-3 py-2 text-xs font-bold uppercase tracking-wide text-konami-text-muted opacity-60"
                        >
                          <MessageCircle size={13} /> Chat with Seller
                        </button>
                      )}
                    </div>
                  </section>

                  <section className="rounded-lg border border-konami-mid-gray p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-konami-text-muted">Sale amount</span>
                      <span className="font-semibold text-konami-text whitespace-nowrap">
                        {formatKES(order.amount)}
                      </span>
                    </div>
                    {PLATFORM_FEE_RATE > 0 && (
                      <div className="flex items-center justify-between gap-3 text-sm mt-2">
                        <span className="text-konami-text-muted">
                          Platform fee ({Math.round(PLATFORM_FEE_RATE * 100)}%)
                        </span>
                        <span className="font-semibold text-konami-gold whitespace-nowrap">
                          -{formatKES(fee)}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-konami-mid-gray flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-konami-text-muted">
                          Pay seller
                        </p>
                        <p className="font-heading text-2xl sm:text-3xl font-extrabold text-green-700 mt-0.5">
                          {formatKES(payout)}
                        </p>
                        <p className="text-[11px] text-konami-text-muted mt-1">
                          {PLATFORM_FEE_RATE > 0
                            ? `Sale amount minus ${Math.round(PLATFORM_FEE_RATE * 100)}% platform fee.`
                            : 'No platform fee — send the full sale amount.'}
                        </p>
                      </div>
                      <button
                        type="button"
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
                    </div>
                  </section>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-konami-text-muted">
        Payouts stay manual: send the “Pay seller” amount to the M-Pesa number shown, then mark it paid
        here. The seller is emailed and notified in-app once you mark it paid.
      </p>
    </div>
  );
}
