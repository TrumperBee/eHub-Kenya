import { Link } from 'react-router-dom';
import { CheckCircle, Phone, Shield, Wallet } from 'lucide-react';

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

// Brand marks are not in lucide-react, so they are inline SVG paths
// (Simple Icons for Instagram / GitHub / WhatsApp, Bootstrap Icons for
// LinkedIn) filled with currentColor to inherit the link's hover colour.
const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': 'true',
  focusable: 'false',
};

function InstagramIcon(props) {
  return (
    <svg {...ICON_PROPS} {...props}>
      <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
    </svg>
  );
}

function GitHubIcon(props) {
  return (
    <svg {...ICON_PROPS} {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function LinkedInIcon(props) {
  return (
    <svg {...ICON_PROPS} viewBox="0 0 16 16" {...props}>
      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" />
    </svg>
  );
}

function WhatsAppIcon(props) {
  return (
    <svg {...ICON_PROPS} {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/ig_link_404._Victor',
    Icon: InstagramIcon,
  },
  {
    label: 'GitHub',
    href: 'https://github.com/TrumperBee',
    Icon: GitHubIcon,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/trumperbee/',
    Icon: LinkedInIcon,
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/254713079528',
    Icon: WhatsAppIcon,
  },
];

const ICON_LINK_CLASS = 'w-5 h-5 text-white/50 hover:text-white transition-colors';

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

      <div className="bg-[#001450] border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-white/30 text-xs text-center">Designed &amp; built by</p>
          <a
            href="https://www.linkedin.com/in/trumperbee/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-center text-sm font-semibold text-white/70 hover:text-white transition-colors"
          >
            Victor Ochieng
          </a>

          <div className="flex gap-4 items-center justify-center mt-3">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
              >
                <Icon className={ICON_LINK_CLASS} />
              </a>
            ))}
            <a href="tel:+254713079528" aria-label="Call +254 713 079 528" title="Call">
              <Phone size={20} className={ICON_LINK_CLASS} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
