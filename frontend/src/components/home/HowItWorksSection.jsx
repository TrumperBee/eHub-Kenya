const steps = [
  { number: '01', title: 'BROWSE', desc: 'Find your perfect account' },
  { number: '02', title: 'BUY NOW', desc: 'Select and proceed to payment' },
  { number: '03', title: 'M-PESA PAY', desc: 'Enter phone, confirm STK Push' },
  { number: '04', title: 'CHAT & TRANSFER', desc: 'Receive your Konami account' },
  { number: '05', title: 'CONFIRM', desc: 'Mark received, funds released' },
];

export default function HowItWorksSection() {
  return (
    <section className="relative py-20 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'rgba(0,59,255,0.88)' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="section-heading section-heading-light yellow-underline inline-block">
            How It Works
          </h2>
          <p className="text-white/70 text-base mt-4">
            Buy an eFootball account in 5 simple steps
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-0 border-t border-dashed" style={{ borderColor: 'rgba(255,241,0,0.4)', top: '48px' }} />

          <div className="flex md:grid md:grid-cols-5 gap-4 md:gap-6 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory scrollbar-none">
            {steps.map((step, i) => (
              <div key={i} className="relative min-w-[200px] md:min-w-0 snap-start">
                <div
                  className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300 min-h-[200px]"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4 font-heading text-2xl font-extrabold"
                    style={{ background: '#FFF100', color: '#111111' }}
                  >
                    {step.number}
                  </div>
                  <h3 className="font-heading text-base font-bold text-white uppercase mb-2">{step.title}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
