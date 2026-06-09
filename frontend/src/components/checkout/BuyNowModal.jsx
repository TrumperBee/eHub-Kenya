import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Circle } from 'lucide-react';
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

  const handleCancel = () => onClose();

  const handleGoToOrder = () => {
    navigate(`/orders/${orderId}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ background: 'rgba(0,20,80,0.85)' }}>
      <div className="bg-white rounded-3xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-card-lg" onClick={(e) => e.stopPropagation()}>
        <div style={{ height: 4, background: '#FFF100' }} />
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #E0E0E0' }}>
          <h2 className="font-heading text-lg font-bold uppercase" style={{ color: '#003BFF' }}>Complete Purchase</h2>
          <button onClick={onClose} className="min-h-[48px] min-w-[48px] flex items-center justify-center" style={{ color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>

        {step === 'confirm' && (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#F5F5F5' }}>
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-konami-blue-deep flex items-center justify-center">
                {listing.photos?.[0] ? (
                  <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl opacity-60"><Circle size={24} /></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-bold truncate" style={{ color: '#111111' }}>{listing.title}</p>
                <TierBadge tier={listing.tier} size="sm" />
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{listing.sellerDisplayName || 'Unknown Seller'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ background: '#003BFF' }}>
              <p className="text-xs text-white/60 mb-1">Total</p>
              <p className="font-heading text-2xl font-extrabold" style={{ color: '#FFF100' }}>{formatKES(listing.price)}</p>
            </div>

            <div className="space-y-2 p-3 rounded-xl" style={{ background: '#F5F5F5' }}>
              <p className="text-xs font-heading font-bold uppercase tracking-wider" style={{ color: '#003BFF' }}>How Payment Works</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-xs" style={{ color: '#6B7280' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5 font-heading font-bold" style={{ background: '#003BFF' }}>1</span>
                  Enter your M-Pesa number below
                </div>
                <div className="flex items-start gap-2 text-xs" style={{ color: '#6B7280' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5 font-heading font-bold" style={{ background: '#003BFF' }}>2</span>
                  You'll receive a PIN prompt on your phone
                </div>
                <div className="flex items-start gap-2 text-xs" style={{ color: '#6B7280' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 mt-0.5 font-heading font-bold" style={{ background: '#003BFF' }}>3</span>
                  Payment is held safely until you confirm delivery
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.3)' }}>
                <p className="text-sm" style={{ color: '#C8102E' }}>{error}</p>
              </div>
            )}

            <MpesaPopup amount={listing.price} onSubmit={handleProceed} loading={loading} />

            <button onClick={handleCancel} className="w-full py-2.5 text-sm font-medium transition-colors" style={{ color: '#6B7280' }}>
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
            {step === 'completed' && (
              <div className="text-center space-y-4">
                <svg className="w-16 h-16 mx-auto" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="#FFF100" strokeWidth="3" strokeDasharray="140" strokeDashoffset="0" strokeLinecap="round" />
                  <path d="M14 24l7 7 13-13" stroke="#FFF100" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" strokeDashoffset="0" />
                </svg>
                <div>
                  <p className="font-heading text-2xl font-extrabold uppercase" style={{ color: '#FFF100' }}>Payment Confirmed!</p>
                  {paymentResult?.mpesaReceiptNumber && (
                    <p className="text-xs mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>Receipt: {paymentResult.mpesaReceiptNumber}</p>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Your order chat is now open</p>
                <button onClick={handleGoToOrder} className="btn-primary w-full py-3 text-sm">Go to Order Chat</button>
              </div>
            )}
            {step === 'failed' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto flex items-center justify-center">
                  <span className="text-5xl" style={{ color: '#C8102E' }}><X size={36} /></span>
                </div>
                <div>
                  <p className="font-heading text-xl font-extrabold text-white uppercase">Payment Not Completed</p>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>The request was cancelled or timed out</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleRetry} className="btn-primary flex-1 py-3 text-sm">Try Again</button>
                  <button onClick={handleCancel} className="btn-secondary flex-1 py-3 text-sm">Cancel</button>
                </div>
              </div>
            )}
            {step === 'timeout' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto flex items-center justify-center">
                  <span className="text-5xl" style={{ color: '#FFF100' }}>!</span>
                </div>
                <div>
                  <p className="font-heading text-xl font-extrabold text-white uppercase">Payment Timeout</p>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>If charged, contact ochiengv250@gmail.com</p>
                </div>
                <button onClick={handleRetry} className="btn-primary w-full py-3 text-sm">Try Again</button>
                <button onClick={handleCancel} className="w-full py-2.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>Close</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
