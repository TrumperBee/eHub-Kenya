import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function Footer() {
  return (
    <footer>
      <div style={{ height: 4, background: '#FFF100' }} />
      <div className="bg-[#001E7A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <img src="/logo.png" alt="eFootball Hub Kenya" className="h-12 w-auto mb-3" />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Kenya's Premier eFootball Account Marketplace
            </p>
            <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Powered by M-Pesa | Protected by Escrow
            </p>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#FFF100' }}>QUICK LINKS</h4>
            <ul className="space-y-3">
              {[
                { label: 'Browse Accounts', path: '/browse' },
                { label: 'How It Works', path: '/how-it-works' },
                { label: 'FAQ', path: '/faq' },
                { label: 'Become a Seller', path: '/apply-seller' },
              ].map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#FFF100' }}>SAFETY</h4>
            <ul className="space-y-3">
              {[
                'M-Pesa Native Payments',
                'Buyer Escrow Protection',
                'Verified Sellers Only',
                'Admin-Moderated Platform',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <span style={{ color: '#FFF100' }}><Check size={14} /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="bg-[#001450] py-4">
        <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          &copy; 2024 eFootball Hub Kenya. Not affiliated with Konami Digital Entertainment.
        </p>
      </div>
    </footer>
  );
}
