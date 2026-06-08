import { useState, useEffect, useRef } from 'react';
import { Smartphone, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function PaymentStatus({
  checkoutRequestId,
  result,
  onPollComplete,
  onGoToOrder,
  onRetry,
  onCancel,
}) {
  const [timeLeft, setTimeLeft] = useState(60);
  const pollStarted = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pollStarted.current && checkoutRequestId) {
      pollStarted.current = true;
      const delay = setTimeout(onPollComplete, 5000);
      return () => clearTimeout(delay);
    }
  }, [checkoutRequestId, onPollComplete]);

  const state = result?.status || 'waiting';

  if (state === 'waiting') {
    return (
      <div className="p-5 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#BF0021]/10 flex items-center justify-center mx-auto animate-pulse">
          <Smartphone className="w-8 h-8 text-[#BF0021]" />
        </div>
        <div>
          <p className="font-heading text-lg font-bold text-white">STK Push sent</p>
          <p className="text-sm text-[#9E9E9E] mt-1">Check your phone and enter your M-Pesa PIN</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-heading font-bold text-white">{timeLeft}s</p>
          <p className="text-xs text-[#5C5C5C] mt-1">Waiting for payment confirmation</p>
        </div>
        <details className="text-center">
          <summary className="text-xs text-[#5C5C5C] cursor-pointer hover:text-[#9E9E9E] transition-colors">
            I didn't receive the prompt
          </summary>
          <p className="text-xs text-[#5C5C5C] mt-2">Please check your number and try again. Make sure you have enough M-Pesa balance and the number is registered for M-Pesa.</p>
        </details>
      </div>
    );
  }

  if (state === 'polling') {
    return (
      <div className="p-5 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#BF0021] animate-spin mx-auto" />
        <div>
          <p className="font-heading text-lg font-bold text-white">Confirming your payment...</p>
          <p className="text-sm text-[#9E9E9E] mt-1">Please wait while we verify the transaction</p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="p-5 text-center space-y-4">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
        <div>
          <p className="font-heading text-xl font-bold text-white">Payment confirmed!</p>
          {result.mpesaReceiptNumber && (
            <p className="text-xs text-[#9E9E9E] mt-1">Receipt: {result.mpesaReceiptNumber}</p>
          )}
        </div>
        <p className="text-sm text-[#9E9E9E]">Your order chat is now open</p>
        <button onClick={onGoToOrder} className="btn-primary w-full py-3 text-sm">
          Go to Order Chat
        </button>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="p-5 text-center space-y-4">
        <XCircle className="w-12 h-12 text-red-400 mx-auto" />
        <div>
          <p className="font-heading text-xl font-bold text-white">Payment was not completed</p>
          <p className="text-sm text-[#9E9E9E] mt-1">The request was cancelled or timed out</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onRetry} className="btn-primary flex-1 py-3 text-sm">
            Try Again
          </button>
          <button onClick={onCancel} className="btn-secondary flex-1 py-3 text-sm">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state === 'timeout') {
    return (
      <div className="p-5 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
        <div>
          <p className="font-heading text-xl font-bold text-white">We couldn't confirm your payment</p>
          <p className="text-sm text-[#9E9E9E] mt-1">If you were charged, contact support at ochiengv250@gmail.com</p>
        </div>
        <button onClick={onRetry} className="btn-primary w-full py-3 text-sm">
          Try Again
        </button>
        <button onClick={onCancel} className="w-full py-2.5 text-sm text-[#5C5C5C] hover:text-white transition-colors">
          Close
        </button>
      </div>
    );
  }

  return null;
}
