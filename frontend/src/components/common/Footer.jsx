import { Link } from 'react-router-dom';
import { CheckCircle, Shield, Wallet } from 'lucide-react';

const LINK_GROUPS = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Browse Accounts', path: '/browse' },
      { label: 'Friday Drops', path: '/friday-drops' },
      { label: 'Become a Seller', path: '/apply-seller' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'How It Works', path: '/how-it-works' },
      { label: 'FAQ', path: '/faq' },
      { label: 'My Orders', path: '/orders' },
    ],
  },
  {
    title: 'Trust & Safety',
    links: [
      { label: 'Escrow Protection', path: '/how-it-works' },
      { label: 'Verified Sellers', path: '/browse' },
      { label: 'M-Pesa Payments', path: '/how-it-works' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="w-full overflow-x-hidden">
      <div className="h-1 bg-[#FFF100]" />
      <div className="bg-[#001450] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10">
          <div className="sm:col-span-2">
            <img src="/logo.png" alt="eHub Market" className="h-12 w-auto max-w-full mb-4" />
            <p className="font-heading text-sm md:text-base font-bold uppercase tracking-wide text-[#FFF100]">
              Kenya's #1 eFootball Account Marketplace
            </p>
            <p className="text-sm leading-relaxed text-white/70 mt-3 max-w-sm">
              eHub Market is Kenya's first verified eFootball account marketplace. Every sale is
              protected by escrow and verified sellers.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5"><Shield size={13} className="text-[#FFF100]" /> Escrow Protected</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle size={13} className="text-[#FFF100]" /> Verified Sellers</span>
              <span className="inline-flex items-center gap-1.5"><Wallet size={13} className="text-[#FFF100]" /> M-Pesa Payments</span>
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="font-heading text-xs font-bold uppercase tracking-widest text-[#FFF100] mb-3">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-sm text-white/70 hover:text-white transition-all duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <p className="text-xs text-white/60">
              5% platform fee on sales — covers payment processing and platform maintenance.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#001450] border-t border-white/10 py-4">
        <p className="text-center text-xs text-white/50 px-4">
          &copy; 2024 eHub Market. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
