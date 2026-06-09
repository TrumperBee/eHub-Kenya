import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, List, ShoppingBag, Wallet, User, Plus, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import OverviewTab from './tabs/OverviewTab';
import ListingsTab from './tabs/ListingsTab';
import OrdersTab from './tabs/OrdersTab';
import EarningsTab from './tabs/EarningsTab';
import ProfileTab from './tabs/ProfileTab';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'listings', label: 'My Listings', icon: List },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'earnings', label: 'Earnings', icon: Wallet },
  { id: 'profile', label: 'Profile', icon: User },
];

const MOBILE_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'listings', label: 'Listings', icon: List },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'earnings', label: 'Earnings', icon: Wallet },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function TransferRoomPage() {
  const { userProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="pt-[68px] min-h-screen" style={{ background: '#F5F5F5' }}>
      <div className="flex">
        <aside className="hidden md:block w-60 shrink-0 min-h-[calc(100vh-68px)] p-4 sticky top-[68px]" style={{ background: '#001E7A' }}>
          <div className="mb-6">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider" style={{ color: '#FFF100' }}>TRANSFER ROOM</h2>
            <p className="text-sm text-white mt-2 truncate">{userProfile?.sellerDisplayName || userProfile?.displayName}</p>
            {userProfile?.sellerRating > 0 && (
              <p className="text-xs text-konami-gold"><Star size={12} className="inline" /> {userProfile.sellerRating.toFixed(1)}</p>
            )}
          </div>

          <nav className="space-y-1 mb-6">
            {NAV_ITEMS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-heading font-bold uppercase tracking-wider transition-colors min-h-[44px]"
                  style={{
                    color: isActive ? '#FFF100' : 'rgba(255,255,255,0.7)',
                    background: isActive ? 'rgba(255,241,0,0.08)' : 'transparent',
                    borderLeft: isActive ? '3px solid #FFF100' : '3px solid transparent',
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <Link to="/transfer-room/new" className="btn-primary w-full flex items-center justify-center gap-2 text-sm" style={{ background: '#FFF100', color: '#111' }}>
            <Plus size={16} /> New Listing +
          </Link>
        </aside>

        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          <div className="md:hidden flex gap-1 mb-4 rounded-xl p-1 overflow-x-auto" style={{ background: '#E0E0E0' }}>
            {MOBILE_NAV.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-heading font-bold uppercase whitespace-nowrap transition-colors min-h-[40px]"
                  style={{
                    background: isActive ? '#003BFF' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#6B7280',
                  }}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'overview' && <OverviewTab profile={userProfile} user={currentUser} onTabChange={setActiveTab} />}
          {activeTab === 'listings' && <ListingsTab profile={userProfile} user={currentUser} onTabChange={setActiveTab} />}
          {activeTab === 'orders' && <OrdersTab profile={userProfile} user={currentUser} onTabChange={setActiveTab} />}
          {activeTab === 'earnings' && <EarningsTab profile={userProfile} user={currentUser} onTabChange={setActiveTab} />}
          {activeTab === 'profile' && <ProfileTab profile={userProfile} user={currentUser} onTabChange={setActiveTab} />}
        </main>
      </div>
    </div>
  );
}
