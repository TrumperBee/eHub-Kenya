import { Search, ShoppingCart, Smartphone, MessageSquare, CheckCircle } from 'lucide-react';

const steps = [
  { icon: Search, title: 'Browse', desc: 'Find the account that suits your team' },
  { icon: ShoppingCart, title: 'Click Buy Now', desc: 'Select your dream squad' },
  { icon: Smartphone, title: 'Pay via M-Pesa', desc: 'Enter your phone, confirm STK Push PIN' },
  { icon: MessageSquare, title: 'Chat with Seller', desc: 'Seller transfers the Konami account to your email' },
  { icon: CheckCircle, title: 'Confirm & Done', desc: 'Mark as received, funds released to seller' },
];

export default function HowItWorksSection() {
  return (
    <section className="py-16 bg-[#1A1A1A]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="section-heading">How It Works</h2>
          <div className="w-16 h-1 bg-[#BF0021] mx-auto mt-3 rounded-full" />
          <p className="text-[#9E9E9E] mt-4">Buy an eFootball account in 5 simple steps</p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-[#2A2A2A] z-0" />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4 relative z-10">
            {steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#BF0021] flex items-center justify-center mx-auto mb-4 relative z-10 shadow-red-glow">
                  <step.icon size={20} className="text-white" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-6 h-6 rounded-full bg-[#BF0021] flex items-center justify-center md:hidden">
                  <span className="text-xs font-bold text-white">{i + 1}</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-white mb-1">{step.title}</h3>
                <p className="text-sm text-[#9E9E9E]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
