const badges = [
  {
    icon: '🔒',
    title: 'Escrow Protected',
    desc: 'Your money is held safely until you confirm receipt',
  },
  {
    icon: '📱',
    title: 'M-Pesa Native',
    desc: 'Pay directly from your Safaricom number',
  },
  {
    icon: '✅',
    title: 'Verified Sellers',
    desc: 'All sellers are approved by our team',
  },
  {
    icon: '🛡️',
    title: 'Buyer Guarantee',
    desc: 'Get a full refund if delivery fails',
  },
];

export default function TrustBadges() {
  return (
    <section className="py-16 bg-[#0D0D0D]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="section-heading">Safe & Secure</h2>
          <div className="w-16 h-1 bg-[#BF0021] mx-auto mt-3 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {badges.map((badge, i) => (
            <div key={i} className="card p-6 text-center hover:border-[#BF0021]/30 transition-colors duration-200">
              <span className="text-4xl block mb-4">{badge.icon}</span>
              <h3 className="font-heading text-lg font-bold text-white mb-2">{badge.title}</h3>
              <p className="text-sm text-[#9E9E9E]">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
