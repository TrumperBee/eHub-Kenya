import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Phone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/firebase';
import { formatKES } from '../../utils/formatters';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

const isValidPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  // Safaricom 07xx and 01xx numbers, local or 254-prefixed.
  return /^(07|01)\d{8}$/.test(digits) || /^254(7|1)\d{8}$/.test(digits) || /^(7|1)\d{8}$/.test(digits);
};

export default function BuyNowButton({ listing, effectivePrice }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('idle');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [timedOut, setTimedOut] = useState(false);

  const pollTimer = useRef(null);
  const cancelled = useRef(false);

  const amount = effectivePrice ?? listing?.price ?? 0;

  // Clean up the poll timer on unmount.
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  // Redirect once the payment is confirmed.
  useEffect(() => {
    if (step !== 'success' || !orderId) return;
    const t = setTimeout(() => navigate(`/orders/${orderId}?payment=success`), 1500);
    return () => clearTimeout(t);
  }, [step, orderId, navigate]);

  const stopPolling = () => {
    cancelled.current = true;
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const pollStatus = async (idToPoll, deadline) => {
    if (cancelled.current) return;
    // Timer callback, not render: checking the clock here is pure by design.
    // eslint-disable-next-line react-hooks/purity
    if (Date.now() > deadline) {
      // We could not confirm the outcome. The payment may still be processing
      // (or the provider may be slow), so never tell the buyer it definitively
      // failed or invite a second payment.
      setTimedOut(true);
      setStep('failed');
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const { data } = await axios.get(`${BACKEND}/api/payment/order-status/${idToPoll}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (cancelled.current) return;

      if (['awaiting_seller_delivery', 'credentials_submitted', 'completed'].includes(data.status)) {
        setStep('success');
        return;
      }
      if (['payment_failed', 'cancelled', 'refunded'].includes(data.status)) {
        setStep('failed');
        return;
      }
    } catch {
      // Transient network error — keep polling until the deadline.
    }

    if (cancelled.current) return;
    pollTimer.current = setTimeout(() => pollStatus(idToPoll, deadline), POLL_INTERVAL_MS);
  };

  const startPolling = (idToPoll) => {
    stopPolling();
    cancelled.current = false;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    pollTimer.current = setTimeout(() => pollStatus(idToPoll, deadline), POLL_INTERVAL_MS);
  };

  const handleSendRequest = async () => {
    setError('');
    setTimedOut(false);
    if (!isValidPhone(phone)) {
      setError('Enter a valid M-Pesa number (e.g. 0712345678)');
      return;
    }
    if (!auth.currentUser) {
      setError('Your session expired. Please log in again.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.post(
        `${BACKEND}/api/payment/stk-push`,
        { listingId: listing.id, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrderId(data.orderId);
      setStep('waiting');
      startPolling(data.orderId);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not start payment. Please try again.');
      setStep('phone');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    stopPolling();
    setError('');
    setStep('idle');
  };

  const handleTryAgain = () => {
    stopPolling();
    setOrderId(null);
    setPhone('');
    setError('');
    setTimedOut(false);
    setStep('idle');
  };

  // ---- Guards ----
  if (!listing) return null;
  if (!currentUser) return null;
  if (listing.sellerId === currentUser.uid) return null;

  if (listing.status === 'sold') {
    return (
      <div
        className="w-full rounded-xl py-4 px-4 text-center font-heading font-bold uppercase tracking-wide text-sm"
        style={{ background: 'rgba(200,16,46,0.2)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B6B' }}
      >
        This Account Has Been Sold
      </div>
    );
  }

  // ---- Step: idle ----
  if (step === 'idle') {
    return (
      <button
        onClick={() => { setError(''); setStep('phone'); }}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-4 font-heading font-bold uppercase tracking-wide text-base transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
        style={{ background: '#FFF100', color: '#111111' }}
      >
        <ShoppingBag size={20} />
        Buy Now — {formatKES(amount)}
      </button>
    );
  }

  // ---- Step: phone ----
  if (step === 'phone') {
    return (
      <div className="w-full space-y-3">
        <label className="block text-white/60 text-[11px] font-heading uppercase tracking-widest">
          M-Pesa phone number
        </label>
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendRequest(); }}
          placeholder="e.g. 0712345678"
          autoFocus
          className="w-full rounded-xl px-4 py-3 text-white outline-none placeholder:text-white/35"
          style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${error ? '#FF6B6B' : 'rgba(255,255,255,0.25)'}` }}
        />
        {error && <p className="text-[11px]" style={{ color: '#FF6B6B' }}>{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="flex-1 rounded-xl py-3 font-heading font-bold uppercase tracking-wide text-sm transition-colors disabled:opacity-50"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#FFFFFF' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSendRequest}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-heading font-bold uppercase tracking-wide text-sm transition-all disabled:opacity-70"
            style={{ background: '#FFF100', color: '#111111' }}
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send Request'}
          </button>
        </div>
      </div>
    );
  }

  // ---- Step: waiting ----
  if (step === 'waiting') {
    return (
      <div
        className="w-full rounded-xl p-5 text-center space-y-3"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
          <Phone size={28} style={{ color: '#FFF100' }} />
          <Loader2 size={46} className="animate-spin absolute inset-0 m-auto" style={{ color: 'rgba(255,241,0,0.35)' }} />
        </div>
        <p className="font-heading font-bold text-white text-sm">STK Push sent to {phone}</p>
        <p className="text-white/70 text-xs">Enter your M-Pesa PIN on your phone</p>
        <p className="text-white/40 text-[11px]">Waiting for confirmation…</p>
      </div>
    );
  }

  // ---- Step: success ----
  if (step === 'success') {
    return (
      <div
        className="w-full rounded-xl p-5 text-center space-y-2"
        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}
      >
        <CheckCircle size={40} className="mx-auto" style={{ color: '#10B981' }} />
        <p className="font-heading font-bold text-white">Payment Confirmed!</p>
        <p className="text-white/60 text-xs">Redirecting to your order…</p>
      </div>
    );
  }

  // ---- Step: failed / unconfirmed ----
  return (
    <div
      className="w-full rounded-xl p-5 text-center space-y-3"
      style={{ background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.4)' }}
    >
      <XCircle size={40} className="mx-auto" style={{ color: '#FF6B6B' }} />
      <p className="font-heading font-bold text-white">
        {timedOut ? 'Still waiting for confirmation' : 'Payment not completed'}
      </p>
      <p className="text-white/60 text-xs">
        {timedOut
          ? 'If you entered your M-Pesa PIN, the payment may still be processing. Check your Orders page before paying again.'
          : 'No money was deducted.'}
      </p>
      {timedOut ? (
        <button
          onClick={() => navigate('/orders')}
          className="w-full rounded-xl py-3 font-heading font-bold uppercase tracking-wide text-sm transition-all"
          style={{ background: '#FFF100', color: '#111111' }}
        >
          View My Orders
        </button>
      ) : (
        <button
          onClick={handleTryAgain}
          className="w-full rounded-xl py-3 font-heading font-bold uppercase tracking-wide text-sm transition-all"
          style={{ background: '#FFF100', color: '#111111' }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
