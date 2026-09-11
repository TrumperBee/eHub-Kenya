import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Clipboard, User, Package, ShoppingCart, Users, Scale, Flame } from 'lucide-react';
import { ADMIN_ROUTE } from '../../utils/constants';
import useOpenDisputeCount from '../../hooks/useOpenDisputeCount';

const NAV_ITEMS = [
  { path: ADMIN_ROUTE,            label: 'Overview',          icon: <BarChart3 size={16} /> },
  { path: `${ADMIN_ROUTE}/applications`, label: 'Applications', icon: <Clipboard size={16} /> },
  { path: `${ADMIN_ROUTE}/sellers`,      label: 'Sellers',      icon: <User size={16} /> },
  { path: `${ADMIN_ROUTE}/listings`,     label: 'Listings',     icon: <Package size={16} /> },
  { path: `${ADMIN_ROUTE}/orders`,       label: 'Orders',       icon: <ShoppingCart size={16} /> },
  { path: `${ADMIN_ROUTE}/friday-drops`, label: 'Friday Drops', icon: <Flame size={16} /> },
  { path: `${ADMIN_ROUTE}/users`,        label: 'Users',        icon: <Users size={16} /> },
  { path: `${ADMIN_ROUTE}/disputes`,     label: 'Disputes',     icon: <Scale size={16} /> },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const { count } = useOpenDisputeCount();

  return (
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="flex">
        <aside className="w-[220px] shrink-0 min-h-[calc(100vh-64px)] bg-[#111] border-r border-[#1A1A1A] p-4 hidden lg:block">
          <div className="mb-6 px-3">
            <h1 className="font-heading text-lg font-bold text-konami-blue uppercase tracking-wider">
              Command Center
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5">Admin access only</p>
          </div>
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isDisputesNav = item.path === `${ADMIN_ROUTE}/disputes`;
              const isActive = item.path === ADMIN_ROUTE
                ? location.pathname === ADMIN_ROUTE
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-konami-blue/10 text-konami-blue font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {isDisputesNav && count > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white"
                      style={{ background: '#C8102E' }}
                    >
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
