import { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../../context/AuthContext';
import { initializePaystackPayment } from '../../services/paymentService';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Loader } from 'lucide-react';
import { formatKES } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function PayNowButton({ listing, effectivePrice }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const amount = effectivePrice ?? listing.price;

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

    setLoading(true);
    try {
      const { reference, orderId } = await initializePaystackPayment({
        listingId: listing.id,
        amount,
      });

      initializePayment({
        config: {
          reference,
          email: currentUser.email,
          amount: amount * 100,
          label: listing.title,
          metadata: { orderId, listingId: listing.id },
        },
        onSuccess: () => {
          toast.success('Payment successful! Opening your order...');
          navigate(`/orders/${orderId}?payment=success`);
          setLoading(false);
        },
        onClose: () => {
          toast('Payment cancelled');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayNow}
      disabled={loading || listing.status === 'sold'}
      className="w-full flex items-center justify-center gap-3
                 bg-konami-yellow hover:bg-yellow-300 active:scale-[0.98]
                 text-konami-text font-heading font-bold uppercase tracking-wide
                 rounded-xl py-4 text-base transition-all duration-200
                 shadow-lg hover:shadow-xl
                 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
    >
      {loading
        ? <><Loader size={20} className="animate-spin" /> Processing...</>
        : <><ShoppingBag size={20} /> Buy Now — {formatKES(amount)}</>
      }
    </button>
  );
}
