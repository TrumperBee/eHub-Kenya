import { Search, ShoppingBag, CreditCard, MessageSquare, CheckCircle } from 'lucide-react';

const steps = [
  { icon: Search, title: 'Browse Accounts', desc: 'Find the account that matches your budget and squad goals. Filter by tier, price, and more on the Browse page.' },
  { icon: ShoppingBag, title: 'Click Buy Now', desc: 'Select your perfect account and click Buy Now. Your order is created instantly.' },
  { icon: CreditCard, title: 'Pay Securely', desc: 'Checkout is handled securely by Paystack, Africa\'s leading payment platform. Choose your payment method inside the Paystack checkout — your payment is held in escrow until you confirm delivery.' },
  { icon: MessageSquare, title: 'Receive Your Account', desc: 'The seller submits the account login details privately inside your order. No passwords are ever shared in chat.' },
  { icon: CheckCircle, title: 'Confirm & Done', desc: 'Mark the account as received — payment is released to the seller. Transaction complete.' },
];

const faqs = [
  { q: 'Is my money safe?', a: 'Yes. Every payment is held in escrow until you confirm delivery. The seller only gets paid after you confirm you have received and verified the account.' },
  { q: 'What if the seller doesn\'t deliver?', a: 'If the seller fails to deliver the account within 24 hours, you can raise a dispute. Our team will investigate and issue a full refund if the seller is at fault.' },
  { q: 'How long does transfer take?', a: 'Most sellers complete the transfer within 24 hours. The chat system allows you to communicate directly with the seller for real-time updates.' },
  { q: 'What payment methods are accepted?', a: 'Paystack powers all payments securely. Inside the Paystack checkout you can pay with mobile money, Visa/Mastercard, or bank transfer — you choose your method at the time of payment.' },
];

export default function HowItWorksPage() {
  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl font-extrabold text-konami-text mb-4">How It Works</h1>
          <p className="text-konami-text-muted max-w-2xl mx-auto">
            Buying an eFootball account on our platform is simple, secure, and fast.
            Follow these 5 steps to get your dream squad.
          </p>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-konami-blue flex items-center justify-center shrink-0">
                    <step.icon size={20} className="text-white" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-konami-mid-gray mt-2" />
                  )}
                </div>
                <div className="pb-8">
                  <h3 className="font-heading text-xl font-bold text-konami-text mb-2">
                    Step {i + 1}: {step.title}
                  </h3>
                  <p className="text-sm text-konami-text-muted leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-t border-konami-mid-gray">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-3xl font-extrabold text-konami-text text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="card p-5">
                <h3 className="font-heading text-lg font-bold text-konami-text mb-2">{faq.q}</h3>
                <p className="text-sm text-konami-text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
