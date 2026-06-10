import { Link } from 'react-router-dom';
import { ChevronDown, Smartphone, Lock, CheckCircle } from 'lucide-react';

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden text-center"
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

      <div className="relative z-10 max-w-4xl mx-auto px-6 w-full flex flex-col items-center justify-center">
        <img
          src="/logo.png"
          alt="eFootball Hub Kenya"
          className="h-20 w-auto mb-6 drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 0 24px rgba(255,241,0,0.4))' }}
        />

        <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6" style={{ background: 'rgba(255,241,0,0.1)', border: '1px solid rgba(255,241,0,0.4)' }}>
          <span className="font-heading font-bold text-[#FFF100] text-xs uppercase tracking-widest">
            Kenya's #1 eFootball Marketplace
          </span>
        </div>

        <div>
          <h1 className="text-[36px] md:text-[64px] font-heading font-extrabold uppercase leading-[1.05] tracking-[0.02em]">
            <div className="text-white">BUY & SELL</div>
            <div style={{ color: '#FFF100' }}>eFOOTBALL</div>
            <div className="text-white">ACCOUNTS</div>
          </h1>
        </div>

        <div className="mt-6 max-w-[520px] mx-auto">
          <p className="text-[15px] md:text-[18px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
            M-Pesa payments. Escrow protected. Verified sellers. No scams. No stress. Just football.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/browse" className="btn-primary text-base !px-10 !py-5">Browse Accounts</Link>
          <Link to="/apply-seller" className="btn-secondary text-base !px-10 !py-5">Become a Seller</Link>
        </div>

        <div className="mt-10 flex items-center justify-center gap-4 md:gap-8 flex-wrap">
          {[
            <><Smartphone size={14} /> M-PESA NATIVE</>,
            <><Lock size={14} /> ESCROW PROTECTED</>,
            <><CheckCircle size={14} /> VERIFIED SELLERS</>,
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-heading text-[13px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {item}
              </span>
              {i < 2 && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-soft">
        <ChevronDown size={24} className="text-white/50" />
      </div>
    </section>
  );
}
