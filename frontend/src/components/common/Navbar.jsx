import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Bell, LogOut, Shield, ShoppingBag, User, House, Search, HelpCircle, MessageCircle, Package, Store, Plus, BarChart3, Settings, Clipboard, Users, DoorOpen, ArrowRight, Wallet, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ADMIN_EMAIL, ADMIN_ROUTE } from '../../utils/constants';
import { formatRelativeTime } from '../../utils/formatters';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const openDrawer = () => { setDrawerOpen(true); document.body.style.overflow = 'hidden'; };
  const closeDrawer = () => { setDrawerOpen(false); document.body.style.overflow = ''; };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setDropdownOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Browse', path: '/browse' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'FAQ', path: '/faq' },
  ];

  const handleLogout = async () => {
    await logout();
    closeDrawer();
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
  const displayName = userProfile?.sellerDisplayName || userProfile?.displayName || currentUser?.displayName || 'User';
  const initials = getInitials(displayName);

  const DrawerNavItem = ({ icon, label, href, activeColor }) => (
    <Link
      to={href}
      onClick={closeDrawer}
      className="flex items-center gap-3.5 mx-2 px-4 rounded-lg transition-colors min-h-[52px]"
      style={{
        color: isActive(href) ? '#FFF100' : '#FFFFFF',
        background: isActive(href) ? 'rgba(255,255,255,0.12)' : 'transparent',
      }}
      onMouseEnter={(e) => { if (!isActive(href)) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={(e) => { if (!isActive(href)) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: isActive(href) ? (activeColor || '#FFF100') : '#FFFFFF', fontSize: 18, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span className="font-heading text-sm font-bold uppercase tracking-wide">{label}</span>
    </Link>
  );

  const SectionLabel = ({ label, color }) => (
    <p className="font-heading text-[11px] font-bold uppercase tracking-[0.15em] px-5 pt-5 pb-2" style={{ color: color || '#FFF100' }}>{label}</p>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[68px]" style={{ background: '#003BFF' }}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/logo.png" alt="eFootball Hub Kenya" className="h-10 w-auto" />
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
                            {n.type === 'payment' ? <Wallet size={16} /> : n.type === 'order' ? <ShoppingBag size={16} /> : n.type === 'chat' ? <MessageCircle size={16} /> : n.type === 'approval' ? <CheckCircle size={16} /> : <Bell size={16} />}
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
                    <Link to="/account" className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                      <User size={16} />
                      My Account
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
          onClick={openDrawer}
          className="md:hidden flex flex-col justify-center items-center w-11 h-11 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          {drawerOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/60" onClick={closeDrawer} />
      )}

      <div
        className={`fixed top-0 left-0 h-full w-[75vw] max-w-[320px] z-[9999] flex flex-col overflow-y-auto transform transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#001E7A', borderRight: '3px solid #FFF100' }}
      >
        <div style={{ background: '#003BFF', padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <div className="flex items-center justify-between mb-3">
            <img src="/logo.png" alt="eFootball Hub Kenya" className="h-8 w-auto" />
            <button onClick={closeDrawer} className="flex items-center justify-center w-11 h-11 shrink-0" aria-label="Close menu">
              <X size={24} className="text-white" />
            </button>
          </div>

          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-heading font-bold shrink-0" style={{ background: '#003BFF', border: '2px solid #FFFFFF' }}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-heading text-sm font-bold text-white truncate">{displayName}</p>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{currentUser.email}</p>
              </div>
            </div>
          )}
        </div>

        <SectionLabel label="MENU" />
        <DrawerNavItem icon={<House size={18} />} label="Home" href="/" />
        <DrawerNavItem icon={<Search size={18} />} label="Browse Accounts" href="/browse" />
        <DrawerNavItem icon={<HelpCircle size={18} />} label="How It Works" href="/how-it-works" />
        <DrawerNavItem icon={<MessageCircle size={18} />} label="FAQ" href="/faq" />

        {currentUser && (
          <>
            <div className="mx-5 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />
            <SectionLabel label="MY ACCOUNT" />
            <DrawerNavItem icon={<Package size={18} />} label="My Orders" href="/orders" />
            <DrawerNavItem icon={<User size={18} />} label="My Account" href="/account" />
            <Link
              to={location.pathname}
              onClick={() => setNotifOpen(true)}
              className="flex items-center gap-3.5 mx-2 px-4 rounded-lg transition-colors min-h-[52px] text-white hover:bg-white/10"
            >
              <span style={{ fontSize: 18, width: 20, textAlign: 'center', flexShrink: 0 }}><Bell size={18} /></span>
              <span className="font-heading text-sm font-bold uppercase tracking-wide flex-1">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FFF100', color: '#111' }}>{unreadCount}</span>
              )}
            </Link>
          </>
        )}

        {userProfile?.sellerApproved && (
          <>
            <div className="mx-5 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />
            <SectionLabel label="SELLER" />
            <DrawerNavItem icon={<Store size={18} />} label="Transfer Room" href="/transfer-room" />
            <DrawerNavItem icon={<Plus size={18} />} label="New Listing" href="/transfer-room/new" />
            <DrawerNavItem icon={<BarChart3 size={18} />} label="My Earnings" href="/transfer-room/earnings" />
          </>
        )}

        {currentUser && !userProfile?.sellerApproved && (
          <div className="mx-3 my-4 rounded-xl p-4" style={{ background: 'rgba(255,241,0,0.12)', border: '1px solid rgba(255,241,0,0.4)' }}>
            <p className="font-heading text-sm font-extrabold mb-1" style={{ color: '#FFF100' }}>BECOME A SELLER</p>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Apply to list your eFootball accounts and earn via M-Pesa.
            </p>
            <Link
              to="/apply-seller"
              onClick={closeDrawer}
              className="flex items-center justify-center w-full h-10 rounded-xl font-heading text-sm font-bold transition-colors"
              style={{ background: '#FFF100', color: '#111111' }}
            >
              APPLY NOW <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="mx-5 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />
            <SectionLabel label="ADMIN" color="#C8102E" />
            <DrawerNavItem icon={<Settings size={18} />} label="Command Center" href={ADMIN_ROUTE} activeColor="#C8102E" />
            <DrawerNavItem icon={<Clipboard size={18} />} label="Applications" href={`${ADMIN_ROUTE}/applications`} activeColor="#C8102E" />
            <DrawerNavItem icon={<Users size={18} />} label="Manage Sellers" href={`${ADMIN_ROUTE}/sellers`} activeColor="#C8102E" />
            <DrawerNavItem icon={<AlertTriangle size={18} />} label="Disputes" href={`${ADMIN_ROUTE}/disputes`} activeColor="#C8102E" />
          </>
        )}

        <div className="mt-auto px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {currentUser ? (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl font-heading text-sm font-bold uppercase transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#FFFFFF', background: 'transparent' }}
            >
              <span><DoorOpen size={18} /></span> Logout
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/login"
                onClick={closeDrawer}
                className="flex items-center justify-center w-full h-12 rounded-xl font-heading text-sm font-bold uppercase transition-colors"
                style={{ border: '1px solid #FFFFFF', color: '#FFFFFF' }}
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeDrawer}
                className="flex items-center justify-center w-full h-12 rounded-xl font-heading text-sm font-bold uppercase transition-colors"
                style={{ background: '#FFF100', color: '#111111' }}
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
