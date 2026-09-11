import { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../../context/AuthContext';
import { initializePaystackPayment, cancelPayment } from '../../services/paymentService';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Loader, ShieldCheck } from 'lucide-react';
import { formatKES } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function PayNowButton({ listing, effectivePrice }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const amount = effectivePrice ?? listing.price;
  const available = listing.status === 'active';

  const initializePayment = usePaystackPayment({
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    currency: 'KES',
  });

  const handlePayNow = async () => {
    if (!currentUser) {
      toast.error('Please log in to purchase');
      navigate('/login');
      return;
    }

    if (listing.sellerId === currentUser.uid) {
      toast.error('You cannot buy your own listing');
      return;
    }

    if (!available) {
      toast.error('This account is no longer available');
      return;
    }

    setLoading(true);
    let orderId = null;
    try {
      const result = await initializePaystackPayment({
        listingId: listing.id,
        amount,
      });
      orderId = result.orderId;

      initializePayment({
        config: {
          reference: result.reference,
          email: currentUser.email,
          amount: amount * 100,
          label: listing.title,
          metadata: { orderId: result.orderId, listingId: listing.id },
        },
        onSuccess: () => {
          toast.success('Payment successful! Opening your order...');
          navigate(`/orders/${result.orderId}?payment=success`);
          setLoading(false);
        },
        onClose: () => {
          toast('Payment cancelled');
          if (result.orderId) {
            cancelPayment(result.orderId).catch(() => {});
          }
          setLoading(false);
        },
      });
    } catch (err) {
      console.error(err);
      if (orderId) {
        cancelPayment(orderId).catch(() => {});
      }
      toast.error(err?.response?.data?.error || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <p className="text-white/50 text-[11px] uppercase tracking-widest font-heading mb-3 text-center">
          Payment
        </p>

        <div className="flex items-center justify-between mb-4">
          <p className="text-white/70 text-sm">Amount</p>
          <p className="font-heading text-2xl font-extrabold text-white">{formatKES(amount)}</p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/10">
          <ShieldCheck size={16} style={{ color: '#FFF100' }} />
          <p className="text-white/60 text-xs">Secure payment powered by Paystack</p>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-4 space-y-1.5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <p className="font-heading text-[11px] font-bold uppercase tracking-widest" style={{ color: '#FFF100' }}>What happens after you pay</p>
        <ol className="text-xs space-y-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
          <li><span className="font-bold" style={{ color: '#FFF100' }}>1.</span> Payment is confirmed and held safely.</li>
          <li><span className="font-bold" style={{ color: '#FFF100' }}>2.</span> The seller sends you the account details inside your order.</li>
          <li><span className="font-bold" style={{ color: '#FFF100' }}>3.</span> You log in, verify, then confirm delivery to finish.</li>
        </ol>
      </div>

      <button
        onClick={handlePayNow}
        disabled={loading || !available}
        className="w-full flex items-center justify-center gap-3
                   bg-konami-yellow hover:bg-yellow-300 active:scale-[0.98]
                   text-konami-text font-heading font-bold uppercase tracking-wide
                   rounded-xl py-4 text-base transition-all duration-200
                   shadow-lg hover:shadow-xl
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {loading
          ? <><Loader size={20} className="animate-spin" /> Processing...</>
          : <><ShoppingBag size={20} /> Continue to Payment</>
        }
      </button>

      <p className="text-white/40 text-[11px] text-center mt-2 leading-relaxed">
        Your payment is securely processed through Paystack. Your order will remain pending until payment is successfully verified.
      </p>
    </div>
  );
}