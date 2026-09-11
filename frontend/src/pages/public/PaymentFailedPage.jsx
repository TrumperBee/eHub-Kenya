import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, Headphones } from 'lucide-react';

export default function PaymentFailedPage() {
  const navigate = useNavigate();

  return (
    <div className="pt-[68px] min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}>
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="card p-8">
          <XCircle size={64} className="mx-auto mb-6" style={{ color: '#C8102E' }} />

          <h1 className="font-heading text-2xl font-extrabold uppercase mb-3" style={{ color: '#111111' }}>
            Payment Unsuccessful
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#6B7280' }}>
            Your payment was not completed. No money was taken from your account.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-bold text-sm uppercase tracking-wide transition-all"
              style={{ background: '#FFF100', color: '#111111' }}
            >
              <ArrowLeft size={16} />
              Try Again
            </button>

            <a
              href="mailto:ochiengv250@gmail.com"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-bold text-sm uppercase tracking-wide transition-all border"
              style={{ borderColor: '#E0E0E0', color: '#6B7280' }}
            >
              <Headphones size={16} />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
