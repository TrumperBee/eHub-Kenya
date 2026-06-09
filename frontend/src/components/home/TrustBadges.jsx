import { Lock, Smartphone, CheckCircle, Shield } from 'lucide-react';

const badges = [
  { icon: <Lock size={36} />, title: 'Escrow Protected', desc: 'Funds held until you confirm delivery' },
  { icon: <Smartphone size={36} />, title: 'M-Pesa Native', desc: 'Pay directly from Safaricom' },
  { icon: <CheckCircle size={36} />, title: 'Verified Sellers', desc: 'Every seller approved by admin' },
  { icon: <Shield size={36} />, title: 'Buyer Guarantee', desc: 'Full refund if seller fails to deliver' },
];

export default function TrustBadges() {
  return (
    <section className="relative py-16 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/1884574/pexels-photo-1884574.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'rgba(0,20,80,0.92)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="section-heading section-heading-light yellow-underline inline-block">
            Safe & Secure
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {badges.map((badge, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <span className="text-4xl block mb-4" style={{ color: '#FFF100' }}>{badge.icon}</span>
              <h3 className="font-heading text-lg font-bold text-white uppercase mb-2">{badge.title}</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
