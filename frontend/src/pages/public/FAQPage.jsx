import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const categories = [
  {
    title: 'Buying',
    questions: [
      { q: 'How do I buy an account?', a: 'Browse listings, click "Buy Now" on your preferred account, enter your M-Pesa number, and confirm the STK Push on your phone.' },
      { q: 'Is my payment secure?', a: 'Yes. Payments are processed through M-Pesa STK Push and held in escrow until you confirm receipt of the account.' },
      { q: 'What if I don\'t receive the account?', a: 'If the seller doesn\'t deliver within 24 hours, you can raise a dispute and our team will investigate.' },
      { q: 'Can I get a refund?', a: 'If the seller fails to deliver or the account doesn\'t match the listing description, you are eligible for a full refund.' },
      { q: 'How do I confirm receipt?', a: 'Once you receive the account credentials and verify they work, go to your order and click "Confirm Receipt" to release funds to the seller.' },
    ],
  },
  {
    title: 'Selling',
    questions: [
      { q: 'How do I become a seller?', a: 'Submit a seller application from your dashboard. Our team will review and approve your application within 24-48 hours.' },
      { q: 'How do I list an account?', a: 'Once approved, access the Transfer Room and click "Create Listing". Fill in the account details, add photos, and set your price.' },
      { q: 'When do I get paid?', a: 'Funds are released to your M-Pesa once the buyer confirms receipt. Transfers are processed within 24 hours of confirmation.' },
      { q: 'What if a buyer disputes?', a: 'If a buyer raises a dispute, our team reviews the evidence from both sides. Funds are held until the dispute is resolved.' },
      { q: 'Can I remove my listing?', a: 'Yes. You can pause or remove your listing anytime from the Transfer Room.' },
    ],
  },
  {
    title: 'Payments',
    questions: [
      { q: 'What payment methods are accepted?', a: 'We accept M-Pesa STK Push payments only. This ensures fast, secure transactions directly from your Safaricom line.' },
      { q: 'How does the escrow system work?', a: 'When you pay, funds are held by our system. They are only released to the seller once you confirm receipt of the account.' },
      { q: 'How long does M-Pesa payment take?', a: 'STK Push is instant. Once you enter your PIN on M-Pesa, the payment is processed within seconds.' },
      { q: 'What if the STK Push doesn\'t arrive?', a: 'Check that your Safaricom number is correct and you have sufficient funds. You can retry the payment from your orders page.' },
      { q: 'Are there any hidden fees?', a: 'No hidden fees. The price you see is the price you pay. Sellers cover the M-Pesa transaction fee.' },
    ],
  },
  {
    title: 'Safety',
    questions: [
      { q: 'How do you verify sellers?', a: 'All sellers go through an application review process. We verify their identity and ensure they have a track record of successful sales.' },
      { q: 'What is escrow protection?', a: 'Escrow means your payment is held securely until you confirm you have received the account. This prevents fraud.' },
      { q: 'Can I report a suspicious listing?', a: 'Yes. Use the report button on any listing or contact our support team directly.' },
      { q: 'How do you handle disputes?', a: 'Our admin team reviews all communications, payment records, and evidence from both parties to make a fair decision.' },
      { q: 'Is my personal information safe?', a: 'Yes. We use Firebase Authentication and Firestore security rules to protect your data. Your phone number is only shared with the seller after purchase.' },
    ],
  },
];

function FAQItem({ question, answer, open, onToggle }) {
  return (
    <div className="border border-[#2A2A2A] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left bg-[#1A1A1A] hover:bg-[#242424] transition-colors"
      >
        <span className="text-sm font-medium text-white pr-4">{question}</span>
        {open ? (
          <ChevronUp size={16} className="text-[#9E9E9E] shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[#9E9E9E] shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 bg-[#1A1A1A] animate-fade-in">
          <p className="text-sm text-[#9E9E9E] leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openCategory, setOpenCategory] = useState(0);
  const [openQuestions, setOpenQuestions] = useState({});

  const toggleQuestion = (catIdx, qIdx) => {
    setOpenQuestions(prev => ({
      ...prev,
      [`${catIdx}-${qIdx}`]: !prev[`${catIdx}-${qIdx}`],
    }));
  };

  return (
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="section-heading mb-4">Frequently Asked Questions</h1>
            <p className="text-[#9E9E9E]">Everything you need to know about buying and selling on eFootball Hub Kenya</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => { setOpenCategory(i); setOpenQuestions({}); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  openCategory === i
                    ? 'bg-[#BF0021] text-white'
                    : 'bg-[#1A1A1A] text-[#9E9E9E] hover:text-white border border-[#2A2A2A]'
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {categories[openCategory].questions.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.q}
                answer={faq.a}
                open={openQuestions[`${openCategory}-${i}`]}
                onToggle={() => toggleQuestion(openCategory, i)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
