import { Link } from 'react-router-dom';
import { ChevronDown, Globe, Smartphone, Lock, CheckCircle } from 'lucide-react';

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ minHeight: 600 }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(0,20,80,0.92) 0%, rgba(0,59,255,0.85) 60%, rgba(0,20,80,0.95) 100%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
        <div className="max-w-3xl">
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6"
            style={{ background: '#FFF100' }}>
            <span className="text-sm"><Globe size={16} /></span>
            <span className="font-heading text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: '#111111' }}>
              KENYA'S #1 eFOOTBALL MARKETPLACE
            </span>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <h1 className="text-[40px] md:text-[64px] font-heading font-extrabold uppercase leading-[1.0] tracking-[0.02em]">
              <span className="text-white">BUY & SELL </span>
              <span style={{ color: '#FFF100' }}>eFOOTBALL</span>
              <span className="text-white"> ACCOUNTS</span>
            </h1>
          </div>

          <div className="animate-fade-in-up mt-6" style={{ animationDelay: '0.6s' }}>
            <p className="text-lg md:text-xl leading-relaxed max-w-[480px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              M-Pesa payments. Escrow protected. Verified sellers. No scams. No stress. Just football.
            </p>
          </div>

          <div className="animate-fade-in-up mt-8 flex flex-col sm:flex-row gap-4" style={{ animationDelay: '0.9s' }}>
            <Link to="/browse" className="btn-primary text-base !px-10 !py-5">Browse Accounts</Link>
            <Link to="/apply-seller" className="btn-secondary text-base !px-10 !py-5">Become a Seller</Link>
          </div>

          <div className="animate-fade-in-up mt-10 flex items-center gap-6" style={{ animationDelay: '1.2s' }}>
            {[<><Smartphone size={14} /> M-PESA NATIVE</>, <><Lock size={14} /> ESCROW PROTECTED</>, <><CheckCircle size={14} /> VERIFIED SELLERS</>].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-heading text-[12px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {item}
                </span>
                {i < 2 && <span className="w-px h-4" style={{ background: 'rgba(255,255,255,0.2)' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-soft">
        <ChevronDown size={24} className="text-white/50" />
      </div>
    </section>
  );
}
