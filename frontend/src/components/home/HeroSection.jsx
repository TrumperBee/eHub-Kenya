import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg, rgba(191,0,33,0.05) 0%, transparent 50%),
            repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px),
            repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px)
          `,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-1.5 border border-[#BF0021]/30 rounded-full px-4 py-1.5 mb-6 bg-[#BF0021]/5">
          <span className="text-sm">🇰🇪</span>
          <span className="text-xs text-[#9E9E9E] font-medium">Kenya's Premier eFootball Marketplace</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4">
          <span className="text-white">Buy & Sell </span>
          <span className="text-[#BF0021]">eFootball Accounts</span>
          <span className="text-white"> Securely</span>
        </h1>

        <p className="text-[#9E9E9E] text-lg mb-8 max-w-2xl mx-auto">
          M-Pesa payments. Escrow protected. Verified sellers. No scams.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link to="/browse" className="btn-primary text-lg px-8 py-4">
            Browse Accounts
          </Link>
          <Link to="/apply-seller" className="btn-secondary text-lg px-8 py-4">
            Become a Seller
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {[
            { text: 'M-Pesa Payments', sub: '100%' },
            { text: 'Escrow Protected', sub: '100%' },
            { text: 'Verified Sellers', sub: '100%' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <p className="text-sm font-semibold text-white">{item.text}</p>
              <p className="text-xs text-[#5C5C5C]">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown size={24} className="text-[#5C5C5C]" />
      </div>
    </section>
  );
}
