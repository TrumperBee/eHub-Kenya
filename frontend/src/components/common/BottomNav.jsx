import { Link, useLocation } from 'react-router-dom';
import { House, Search, Package, User } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/',        label: 'Home',   icon: <House size={20} /> },
  { path: '/browse',  label: 'Browse', icon: <Search size={20} /> },
  { path: '/orders',  label: 'Orders', icon: <Package size={20} /> },
  { path: '/account', label: 'Profile', icon: <User size={20} /> },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ background: '#003BFF', height: 64 }}>
      <div className="flex items-center justify-around h-full px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] px-3"
            >
              <span style={{ fontSize: 20, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              <span
                className="font-heading text-[10px] font-bold uppercase tracking-wider"
                style={{
                  color: isActive ? '#FFF100' : 'rgba(255,255,255,0.7)',
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full" style={{ background: '#FFF100' }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
