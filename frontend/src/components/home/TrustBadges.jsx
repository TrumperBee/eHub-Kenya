import { Lock, CreditCard, CheckCircle, Shield } from 'lucide-react';

const badges = [
  { icon: <CheckCircle size={36} />, title: 'Verified Sellers', desc: 'Every seller is reviewed and approved by eHub admin before listing.' },
  { icon: <Lock size={36} />, title: 'Escrow Protected', desc: 'Your money is held securely until you confirm the account works.' },
  { icon: <CreditCard size={36} />, title: 'M-Pesa Payments', desc: 'Pay in seconds with a secure M-Pesa STK Push prompt on your phone.' },
  { icon: <Shield size={36} />, title: 'ZetuPay Secured', desc: 'Payments are processed and protected by ZetuPay.' },
];

export default function TrustBadges() {
  return (
    <section className="relative py-10 md:py-16 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/1884574/pexels-photo-1884574.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'rgba(0,20,80,0.94)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="section-heading section-heading-light yellow-underline inline-block">
            Safe and Secure
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {badges.map((badge) => (
            <div
              key={badge.title}
              className="rounded-2xl p-4 md:p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <span className="block mb-4" style={{ color: '#FFF100' }}>{badge.icon}</span>
              <h3 className="font-heading text-base md:text-lg font-bold text-white uppercase tracking-wide mb-2">{badge.title}</h3>
              <p className="text-sm leading-relaxed text-white/70">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
