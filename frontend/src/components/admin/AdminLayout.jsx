import { Link, useLocation } from 'react-router-dom';
import { ADMIN_ROUTE } from '../../utils/constants';

const NAV_ITEMS = [
  { path: ADMIN_ROUTE,            label: 'Overview',          icon: '📊' },
  { path: `${ADMIN_ROUTE}/applications`, label: 'Applications', icon: '📋' },
  { path: `${ADMIN_ROUTE}/sellers`,      label: 'Sellers',      icon: '👤' },
  { path: `${ADMIN_ROUTE}/listings`,     label: 'Listings',     icon: '📦' },
  { path: `${ADMIN_ROUTE}/orders`,       label: 'Orders',       icon: '🛒' },
  { path: `${ADMIN_ROUTE}/users`,        label: 'Users',        icon: '👥' },
  { path: `${ADMIN_ROUTE}/disputes`,     label: 'Disputes',     icon: '⚖️' },
];

export default function AdminLayout({ children }) {
  const location = useLocation();

  return (
    <div className="pt-16 min-h-screen bg-[#0A0A0A]">
      <div className="flex">
        <aside className="w-[220px] shrink-0 min-h-[calc(100vh-64px)] bg-[#111] border-r border-[#1A1A1A] p-4 hidden lg:block">
          <div className="mb-6 px-3">
            <h1 className="font-heading text-lg font-bold text-[#BF0021] uppercase tracking-wider">
              Command Center
            </h1>
            <p className="text-[10px] text-[#5C5C5C] mt-0.5">Admin access only</p>
          </div>
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.path === ADMIN_ROUTE
                ? location.pathname === ADMIN_ROUTE
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-[#BF0021]/10 text-[#BF0021] font-semibold'
                      : 'text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
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
