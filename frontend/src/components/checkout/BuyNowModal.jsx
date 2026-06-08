import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createOrder } from '../../services/ordersService';
import { formatKES } from '../../utils/formatters';
import { TIERS } from '../../utils/constants';
import { generateOrderId, initiatePayment, pollPaymentStatus } from '../../services/paymentService';
import TierBadge from '../listings/TierBadge';
import MpesaPopup from './MpesaPopup';
import PaymentStatus from './PaymentStatus';

export default function BuyNowModal({ listing, onClose }) {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('confirm');
  const [orderId, setOrderId] = useState(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleProceed = async (phone) => {
    setLoading(true);
    setError('');
    try {
      const newOrderId = generateOrderId();
      setOrderId(newOrderId);

      await createOrder({
        orderId: newOrderId,
        listingId: listing.id,
        listingTitle: listing.title,
        buyerId: currentUser.uid,
        buyerEmail: currentUser.email,
        buyerDisplayName: userProfile?.displayName || currentUser.displayName || 'Buyer',
        sellerId: listing.sellerId,
        sellerDisplayName: listing.sellerDisplayName || 'Seller',
        amount: listing.price,
        status: 'pending_payment',
        escrowStatus: 'none',
        tier: listing.tier,
        platform: listing.platform,
      });

      const result = await initiatePayment({
        phone,
        amount: listing.price,
        orderId: newOrderId,
        listingId: listing.id,
        listingTitle: listing.title,
      });

      if (!result.success) {
        throw new Error(result.error || 'Payment initiation failed');
      }

      setCheckoutRequestId(result.checkoutRequestId);
      setStep('payment');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = async () => {
    setPaymentResult({ status: 'polling' });
    const result = await pollPaymentStatus(checkoutRequestId);
    setPaymentResult(result);
    if (result.status === 'success') {
      setStep('completed');
    } else if (result.status === 'failed') {
      setStep('failed');
    } else {
      setStep('timeout');
    }
  };

  const handleRetry = () => {
    setStep('confirm');
    setOrderId(null);
    setCheckoutRequestId(null);
    setPaymentResult(null);
    setError('');
  };

  const handleCancel = () => {
    onClose();
  };

  const handleGoToOrder = () => {
    navigate(`/orders/${orderId}`);
    onClose();
  };

  const tierConfig = TIERS[listing.tier] || TIERS.bronze;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
          <h2 className="font-heading text-lg font-bold text-white">Complete Purchase</h2>
          <button onClick={onClose} className="text-[#5C5C5C] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {step === 'confirm' && (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3 p-3 bg-[#242424] rounded-xl">
              <div className="w-14 h-14 rounded-lg bg-[#2E2E2E] overflow-hidden shrink-0">
                {listing.photos?.[0] ? (
                  <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">⚽</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{listing.title}</p>
                <TierBadge tier={listing.tier} size="sm" />
                <p className="text-xs text-[#5C5C5C] mt-0.5">{listing.sellerDisplayName || 'Unknown Seller'}</p>
              </div>
            </div>

            <div className="p-3 bg-[#242424] rounded-xl">
              <p className="text-xs text-[#9E9E9E] mb-1">Total</p>
              <p className="font-heading text-2xl font-bold text-white">{formatKES(listing.price)}</p>
            </div>

            <div className="space-y-2 p-3 bg-[#242424] rounded-xl">
              <p className="text-xs font-semibold text-[#9E9E9E] uppercase tracking-wider">How Payment Works</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-xs text-[#9E9E9E]">
                  <span className="w-4 h-4 rounded-full bg-[#BF0021] flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5">1</span>
                  Enter your M-Pesa number below
                </div>
                <div className="flex items-start gap-2 text-xs text-[#9E9E9E]">
                  <span className="w-4 h-4 rounded-full bg-[#BF0021] flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5">2</span>
                  You'll receive a PIN prompt on your phone
                </div>
                <div className="flex items-start gap-2 text-xs text-[#9E9E9E]">
                  <span className="w-4 h-4 rounded-full bg-[#BF0021] flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5">3</span>
                  Payment is held safely until you confirm delivery
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-400/10 border border-red-400/30 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <MpesaPopup
              amount={listing.price}
              onSubmit={handleProceed}
              loading={loading}
            />

            <button
              onClick={handleCancel}
              className="w-full py-2.5 text-sm text-[#5C5C5C] hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {step === 'payment' && (
          <PaymentStatus
            checkoutRequestId={checkoutRequestId}
            result={paymentResult}
            onPollComplete={handlePaymentComplete}
            onGoToOrder={handleGoToOrder}
            onRetry={handleRetry}
            onCancel={handleCancel}
          />
        )}

        {(step === 'completed' || step === 'failed' || step === 'timeout') && (
          <div className="p-5">
            {(step === 'completed') && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-400/10 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-xl font-bold text-white mb-1">Payment confirmed!</p>
                  {paymentResult?.mpesaReceiptNumber && (
                    <p className="text-xs text-[#9E9E9E]">Receipt: {paymentResult.mpesaReceiptNumber}</p>
                  )}
                </div>
                <p className="text-sm text-[#9E9E9E]">Your order chat is now open</p>
                <button onClick={handleGoToOrder} className="btn-primary w-full py-3 text-sm">
                  Go to Order Chat
                </button>
              </div>
            )}
            {(step === 'failed') && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-400/10 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-xl font-bold text-white mb-1">Payment was not completed</p>
                  <p className="text-sm text-[#9E9E9E]">The request was cancelled or timed out</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleRetry} className="btn-primary flex-1 py-3 text-sm">
                    Try Again
                  </button>
                  <button onClick={handleCancel} className="btn-secondary flex-1 py-3 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {(step === 'timeout') && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-yellow-400/10 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-xl font-bold text-white mb-1">We couldn't confirm your payment</p>
                  <p className="text-sm text-[#9E9E9E]">If you were charged, contact support at ochiengv250@gmail.com</p>
                </div>
                <button onClick={handleRetry} className="btn-primary w-full py-3 text-sm">
                  Try Again
                </button>
                <button onClick={handleCancel} className="w-full py-2.5 text-sm text-[#5C5C5C] hover:text-white transition-colors">
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
