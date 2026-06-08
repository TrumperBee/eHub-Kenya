import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User, ShoppingBag, Shield, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ADMIN_EMAIL, ADMIN_ROUTE } from '../../utils/constants';
import { formatRelativeTime } from '../../utils/formatters';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Browse', path: '/browse' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'FAQ', path: '/faq' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleNotifClick = (n) => {
    if (!n.read) markAsRead(n.id);
    if (n.orderId) navigate(`/orders/${n.orderId}`);
    else if (n.type === 'approval') navigate('/transfer-room');
    setNotifOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const displayName = userProfile?.displayName || currentUser?.displayName || 'User';
  const initials = getInitials(displayName);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[68px] md:h-[68px] h-[60px]" style={{ background: '#003BFF' }}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5">
          <span className="font-heading text-xl font-extrabold text-white uppercase tracking-wider">
            eFOOTBALL HUB
          </span>
          <span className="font-heading text-xl font-extrabold uppercase tracking-wider" style={{ color: '#FFF100' }}>
            KENYA
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-5">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className="font-heading text-[13px] font-bold uppercase tracking-[0.1em] transition-colors duration-200"
              style={{
                color: location.pathname === link.path ? '#FFF100' : '#FFFFFF',
              }}
            >
              {link.label}
            </Link>
          ))}
          <span className="text-white/30 text-xs">|</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {!currentUser ? (
            <>
              <Link to="/login" className="btn-ghost text-sm">Login</Link>
              <Link to="/register" className="btn-primary text-sm !px-6 !py-3">Register</Link>
            </>
          ) : (
            <>
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-lg hover:bg-white/10 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                >
                  <Bell size={20} className="text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
                      style={{ background: '#FFF100', color: '#111111' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-card-lg py-2 max-h-96 overflow-y-auto animate-fade-in"
                    style={{ background: '#001E7A', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                      <p className="text-sm font-heading font-bold text-white">NOTIFICATIONS</p>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs font-medium" style={{ color: '#FFF100' }}>
                          Mark all as read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-center py-6" style={{ color: 'rgba(255,255,255,0.4)' }}>No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/10 transition-colors"
                          style={!n.read ? { background: 'rgba(255,241,0,0.05)' } : {}}
                        >
                          <span className="text-base shrink-0 mt-0.5">
                            {n.type === 'payment' ? '💰' : n.type === 'order' ? '🛒' : n.type === 'chat' ? '💬' : n.type === 'approval' ? '✅' : '🔔'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{n.title}</p>
                            <p className="text-xs line-clamp-2 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{n.message}</p>
                            <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{formatRelativeTime(n.createdAt)}</p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#FFF100' }} />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors duration-200 min-h-[48px]"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-heading font-bold"
                    style={{ background: '#001E7A' }}>
                    {initials}
                  </div>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-card-lg py-2 animate-fade-in"
                    style={{ background: '#001E7A', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-sm font-heading font-bold text-white truncate">{displayName}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{currentUser.email}</p>
                    </div>

                    <Link to="/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                      <ShoppingBag size={16} />
                      My Orders
                    </Link>
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                      <User size={16} />
                      Profile
                    </Link>

                    {userProfile?.sellerApproved && (
                      <Link to="/transfer-room" className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                        <Shield size={16} />
                        Transfer Room
                      </Link>
                    )}

                    {!userProfile?.sellerApproved && (
                      <Link to="/apply-seller" className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                        <Shield size={16} />
                        Become a Seller
                      </Link>
                    )}

                    {isAdmin && (
                      <Link to={ADMIN_ROUTE} className="flex items-center gap-3 px-4 py-2.5 text-xs font-heading font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                        Admin Panel
                      </Link>
                    )}

                    <div className="border-t border-white/10 mt-1 pt-1">
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors hover:bg-white/10"
                        style={{ color: '#C8102E' }}>
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white p-2 min-h-[48px] min-w-[48px] flex items-center justify-center"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] z-50 animate-fade-in"
          style={{ background: '#001E7A' }}>
          <div className="px-6 py-6 space-y-2">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-4 py-3 rounded-xl font-heading text-sm font-bold uppercase tracking-wider transition-colors"
                style={{
                  color: location.pathname === link.path ? '#FFF100' : 'rgba(255,255,255,0.8)',
                  background: location.pathname === link.path ? 'rgba(255,241,0,0.1)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-white/10 my-4" />
            {!currentUser ? (
              <div className="flex flex-col gap-3 pt-2">
                <Link to="/login" className="w-full text-center btn-ghost !text-white !border !border-white/30 !py-3">Login</Link>
                <Link to="/register" className="w-full text-center btn-primary !py-3">Register</Link>
              </div>
            ) : (
              <div className="space-y-1 pt-2">
                <Link to="/orders" className="block px-4 py-3 rounded-xl text-sm text-white/80 hover:bg-white/10 font-medium">My Orders</Link>
                <Link to="/profile" className="block px-4 py-3 rounded-xl text-sm text-white/80 hover:bg-white/10 font-medium">Profile</Link>
                {userProfile?.sellerApproved && (
                  <Link to="/transfer-room" className="block px-4 py-3 rounded-xl text-sm text-white/80 hover:bg-white/10 font-medium">Transfer Room</Link>
                )}
                {!userProfile?.sellerApproved && (
                  <Link to="/apply-seller" className="block px-4 py-3 rounded-xl text-sm text-white/80 hover:bg-white/10 font-medium">Become a Seller</Link>
                )}
                {isAdmin && (
                  <Link to={ADMIN_ROUTE} className="block px-4 py-3 rounded-xl text-xs text-white/50 hover:bg-white/10 font-heading font-bold uppercase tracking-wider">Admin Panel</Link>
                )}
                <button onClick={handleLogout} className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium hover:bg-white/10"
                  style={{ color: '#C8102E' }}>Logout</button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
