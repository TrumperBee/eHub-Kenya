import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#0D0D0D] border-t border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-1 mb-3">
              <span className="font-heading text-xl font-bold text-white tracking-wide">
                eFootball Hub
              </span>
              <span className="font-heading text-xl font-bold" style={{ color: '#BF0021' }}>
                Kenya
              </span>
            </div>
            <p className="text-sm text-[#9E9E9E]">
              Kenya's #1 eFootball Account Marketplace
            </p>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-white mb-4">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/browse" className="block text-sm text-[#9E9E9E] hover:text-white transition-colors">Browse</Link>
              <Link to="/how-it-works" className="block text-sm text-[#9E9E9E] hover:text-white transition-colors">How It Works</Link>
              <Link to="/faq" className="block text-sm text-[#9E9E9E] hover:text-white transition-colors">FAQ</Link>
              <Link to="/apply-seller" className="block text-sm text-[#9E9E9E] hover:text-white transition-colors">Become a Seller</Link>
            </div>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-white mb-4">Trust & Safety</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-[#9E9E9E]">
                <span className="text-green-400">&#x2713;</span> Safe & Secure
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-[#9E9E9E]">
                M-Pesa Payments
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#1A1A1A] border border-[#BF0021] rounded-lg px-3 py-1.5 text-xs text-white ml-2">
                Escrow Protected
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A] mt-8 pt-6 text-center">
          <p className="text-xs text-[#5C5C5C]">
            &copy; 2024 eFootball Hub Kenya. Not affiliated with Konami.
          </p>
        </div>
      </div>
    </footer>
  );
}
