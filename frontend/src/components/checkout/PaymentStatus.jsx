import { useState, useEffect, useRef } from 'react';
import { Smartphone, X } from 'lucide-react';

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

  const circleDeg = ((60 - timeLeft) / 60) * 360;

  return (
    <div
      className="p-8 text-center space-y-6 rounded-b-2xl"
      style={{
        background: 'linear-gradient(135deg, #001450 0%, #003BFF 100%)',
      }}
    >
      {state === 'waiting' && (
        <>
          <div className="animate-pulse">
            <Smartphone size={64} className="text-white mx-auto" />
          </div>
          <div>
            <p className="font-heading text-[28px] font-extrabold text-white uppercase">STK Push Sent</p>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Check your phone and enter your PIN
            </p>
          </div>

          <div className="relative w-20 h-20 mx-auto">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="#FFF100" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(circleDeg / 360) * 213.6} 213.6`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-heading text-xl font-extrabold text-white">
              {timeLeft}s
            </span>
          </div>

          <details className="text-center">
            <summary className="text-xs cursor-pointer hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
              I didn't receive the prompt
            </summary>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Please check your number and try again. Make sure you have enough M-Pesa balance.
            </p>
          </details>
        </>
      )}

      {state === 'polling' && (
        <>
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: '#FFF100', borderRightColor: '#FFF100' }} />
          <div>
            <p className="font-heading text-[22px] font-extrabold text-white uppercase">Confirming Payment...</p>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Please wait while we verify</p>
          </div>
        </>
      )}

      {state === 'success' && (
        <>
          <svg className="w-16 h-16 mx-auto" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#FFF100" strokeWidth="3" strokeDasharray="140" strokeDashoffset="0" strokeLinecap="round" />
            <path d="M14 24l7 7 13-13" stroke="#FFF100" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" strokeDashoffset="0" />
          </svg>
          <div>
            <p className="font-heading text-2xl font-extrabold uppercase" style={{ color: '#FFF100' }}>Payment Confirmed!</p>
            {result?.mpesaReceiptNumber && (
              <p className="text-xs mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>Receipt: {result.mpesaReceiptNumber}</p>
            )}
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Your order chat is now open</p>
          <button onClick={onGoToOrder} className="btn-primary w-full py-3 text-sm">Go to Order Chat</button>
        </>
      )}

      {(state === 'failed') && (
        <>
          <div className="w-16 h-16 mx-auto flex items-center justify-center">
            <span className="text-5xl" style={{ color: '#C8102E' }}><X size={36} /></span>
          </div>
          <div>
            <p className="font-heading text-xl font-extrabold text-white uppercase">Payment Not Completed</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>The request was cancelled or timed out</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onRetry} className="btn-primary flex-1 py-3 text-sm">Try Again</button>
            <button onClick={onCancel} className="btn-secondary flex-1 py-3 text-sm">Cancel</button>
          </div>
        </>
      )}

      {state === 'timeout' && (
        <>
          <div className="w-16 h-16 mx-auto flex items-center justify-center">
            <span className="text-5xl" style={{ color: '#FFF100' }}>!</span>
          </div>
          <div>
            <p className="font-heading text-xl font-extrabold text-white uppercase">Payment Timeout</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>If charged, contact ochiengv250@gmail.com</p>
          </div>
          <button onClick={onRetry} className="btn-primary w-full py-3 text-sm">Try Again</button>
          <button onClick={onCancel} className="w-full py-2.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>Close</button>
        </>
      )}
    </div>
  );
}
