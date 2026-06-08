import { Search, ShoppingCart, Smartphone, MessageSquare, CheckCircle } from 'lucide-react';

const steps = [
  { icon: Search, title: 'Browse Accounts', desc: 'Browse through our verified listings to find the perfect eFootball account for your squad. Filter by tier, platform, price, and more.', color: '#BF0021' },
  { icon: ShoppingCart, title: 'Click Buy Now', desc: 'Found your dream account? Click the Buy Now button on any listing to begin the purchase process.', color: '#BF0021' },
  { icon: Smartphone, title: 'Pay via M-Pesa', desc: 'Enter your Safaricom phone number to receive an M-Pesa STK Push prompt. Confirm the payment on your phone to complete the transaction.', color: '#BF0021' },
  { icon: MessageSquare, title: 'Chat with the Seller', desc: 'Once payment is confirmed, you can chat directly with the seller. They will transfer the Konami account credentials to your registered email.', color: '#BF0021' },
  { icon: CheckCircle, title: 'Confirm & Complete', desc: 'Once you receive the account and verify everything works, mark the order as complete. The funds are then released to the seller.', color: '#BF0021' },
];

const faqs = [
  { q: 'Is my money safe?', a: 'Yes. Every payment is held in escrow until you confirm receipt. The seller only gets paid after you confirm you have received and verified the account.' },
  { q: 'What if the seller doesn\'t deliver?', a: 'If the seller fails to deliver the account within 24 hours, you can raise a dispute. Our team will investigate and issue a full refund if the seller is at fault.' },
  { q: 'How long does transfer take?', a: 'Most sellers complete the transfer within 24 hours. The chat system allows you to communicate directly with the seller for real-time updates.' },
  { q: 'What if I don\'t receive the STK Push?', a: 'Make sure you entered the correct Safaricom number. If you still don\'t receive the prompt, check that your M-Pesa app is updated and try again. Contact support if the issue persists.' },
];

export default function HowItWorksPage() {
  return (
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="section-heading mb-4">How It Works</h1>
          <p className="text-[#9E9E9E] max-w-2xl mx-auto">
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
                  <div className="w-12 h-12 rounded-full bg-[#BF0021] flex items-center justify-center shrink-0">
                    <step.icon size={20} className="text-white" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-[#2A2A2A] mt-2" />
                  )}
                </div>
                <div className="pb-8">
                  <h3 className="font-heading text-xl font-bold text-white mb-2">
                    Step {i + 1}: {step.title}
                  </h3>
                  <p className="text-sm text-[#9E9E9E] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-[#1A1A1A]">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="section-heading text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="card p-5">
                <h3 className="font-heading text-lg font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-[#9E9E9E] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
