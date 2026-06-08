import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, User, ShoppingBag, Shield, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ADMIN_EMAIL, ADMIN_ROUTE } from '../../utils/constants';
import { formatRelativeTime } from '../../utils/formatters';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0D0D0D]/80 backdrop-blur-md border-b border-[#2A2A2A]'
          : 'bg-[#0D0D0D] border-b border-[#2A2A2A]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1">
          <span className="font-heading text-xl font-bold text-white tracking-wide">
            eFootball Hub
          </span>
          <span className="font-heading text-xl font-bold" style={{ color: '#BF0021' }}>
            Kenya
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === link.path
                  ? 'text-[#BF0021]'
                  : 'text-[#9E9E9E] hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {!currentUser ? (
            <>
              <Link to="/login" className="btn-ghost text-sm">Login</Link>
              <Link to="/register" className="btn-primary text-sm">Register</Link>
            </>
          ) : (
            <>
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                >
                  <Bell size={20} className="text-[#9E9E9E] hover:text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-[#BF0021] text-white text-[10px] font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-card py-2 animate-fade-in max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A]">
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-[#BF0021] hover:underline">
                          Mark all as read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-[#5C5C5C] text-center py-6">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#242424] transition-colors ${
                            !n.read ? 'bg-[#BF0021]/5' : ''
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">
                            {n.type === 'payment' ? '💰' : n.type === 'order' ? '🛒' : n.type === 'chat' ? '💬' : n.type === 'approval' ? '✅' : '🔔'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{n.title}</p>
                            <p className="text-xs text-[#9E9E9E] line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-[#5C5C5C] mt-1">{formatRelativeTime(n.createdAt)}</p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-[#BF0021] shrink-0 mt-1.5" />
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
                  className="flex items-center gap-2 hover:bg-[#1A1A1A] rounded-lg px-3 py-2 transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-[#BF0021] flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <ChevronDown size={14} className="text-[#9E9E9E]" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-card py-2 animate-fade-in">
                    <div className="px-4 py-2 border-b border-[#2A2A2A]">
                      <p className="text-sm font-medium text-white truncate">{displayName}</p>
                      <p className="text-xs text-[#5C5C5C] truncate">{currentUser.email}</p>
                    </div>

                    <Link to="/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#9E9E9E] hover:text-white hover:bg-[#242424] transition-colors">
                      <ShoppingBag size={16} />
                      My Orders
                    </Link>
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#9E9E9E] hover:text-white hover:bg-[#242424] transition-colors">
                      <User size={16} />
                      Profile
                    </Link>

                    {userProfile?.sellerApproved && (
                      <Link to="/transfer-room" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#9E9E9E] hover:text-white hover:bg-[#242424] transition-colors">
                        <Shield size={16} />
                        Transfer Room
                      </Link>
                    )}

                    {!userProfile?.sellerApproved && (
                      <Link to="/apply-seller" className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#9E9E9E] hover:text-white hover:bg-[#242424] transition-colors">
                        <Shield size={16} />
                        Become a Seller
                      </Link>
                    )}

                    {isAdmin && (
                      <Link to={ADMIN_ROUTE} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#9E9E9E] hover:text-white hover:bg-[#242424] transition-colors">
                        Admin Panel
                      </Link>
                    )}

                    <div className="border-t border-[#2A2A2A] mt-1 pt-1">
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#9E9E9E] hover:text-[#BF0021] hover:bg-[#242424] transition-colors">
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
          className="md:hidden text-white p-2"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#0D0D0D] border-b border-[#2A2A2A] animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-[#BF0021] bg-[#1A1A1A]'
                    : 'text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-[#2A2A2A] my-2" />
            {!currentUser ? (
              <div className="flex gap-2 pt-2">
                <Link to="/login" className="flex-1 text-center btn-ghost text-sm">Login</Link>
                <Link to="/register" className="flex-1 text-center btn-primary text-sm">Register</Link>
              </div>
            ) : (
              <div className="space-y-1 pt-2">
                <Link to="/orders" className="block px-3 py-2 rounded-lg text-sm text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]">My Orders</Link>
                <Link to="/profile" className="block px-3 py-2 rounded-lg text-sm text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]">Profile</Link>
                {userProfile?.sellerApproved && (
                  <Link to="/transfer-room" className="block px-3 py-2 rounded-lg text-sm text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]">Transfer Room</Link>
                )}
                {!userProfile?.sellerApproved && (
                  <Link to="/apply-seller" className="block px-3 py-2 rounded-lg text-sm text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]">Become a Seller</Link>
                )}
                {isAdmin && (
                  <Link to={ADMIN_ROUTE} className="block px-3 py-2 rounded-lg text-sm text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]">Admin Panel</Link>
                )}
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-[#BF0021] hover:bg-[#1A1A1A]">Logout</button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
