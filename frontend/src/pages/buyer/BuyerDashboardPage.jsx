import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Clock, CheckCircle, ArrowRight, Shield, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getBuyerOrders } from '../../services/ordersService';
import { getSellerApplication } from '../../services/usersService';
import { formatKES, formatDate } from '../../utils/formatters';

export default function BuyerDashboardPage() {
  const { currentUser, userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [sellerApp, setSellerApp] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    getBuyerOrders(currentUser.uid).then((o) => {
      setOrders(o);
      setLoadingOrders(false);
    });
    getSellerApplication(currentUser.uid).then(setSellerApp);
  }, [currentUser]);

  const inProgress = orders.filter((o) =>
    ['pending_payment', 'payment_confirmed', 'in_transfer'].includes(o.status)
  );

  const completedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="pt-16 min-h-screen bg-[#0D0D0D]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="section-heading mb-2">
          Welcome back, {userProfile?.displayName || 'Buyer'}
        </h1>
        <p className="text-[#9E9E9E] mb-8">Manage your purchases and account.</p>

        {sellerApp?.status === 'pending' && (
          <div className="mb-6 flex items-center gap-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-5 py-4">
            <Clock size={20} className="text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-400/80">Your seller application is under review.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[#9E9E9E]">Total Purchases</p>
              <ShoppingBag size={18} className="text-[#BF0021]" />
            </div>
            <p className="font-heading text-2xl font-bold text-white">{orders.length}</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[#9E9E9E]">In Progress</p>
              <Loader size={18} className="text-yellow-400" />
            </div>
            <p className="font-heading text-2xl font-bold text-white">{inProgress.length}</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[#9E9E9E]">Completed</p>
              <CheckCircle size={18} className="text-green-400" />
            </div>
            <p className="font-heading text-2xl font-bold text-white">{completedCount}</p>
          </div>
        </div>

        <div className="card mb-8">
          <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Recent Orders</h2>
            {orders.length > 0 && (
              <Link to="/orders" className="text-sm text-[#BF0021] hover:text-[#E0001B] transition-colors">
                View All
              </Link>
            )}
          </div>

          {loadingOrders ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-transparent border-t-[#BF0021] rounded-full animate-spin" style={{ borderRightColor: '#BF0021' }} />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag size={40} className="mx-auto mb-3 text-[#5C5C5C]" />
              <p className="text-[#9E9E9E] mb-4">No orders yet. Browse accounts to get started.</p>
              <Link to="/browse" className="btn-primary inline-flex items-center gap-2">
                Browse Accounts <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
              {orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[#242424] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{order.listingTitle}</p>
                    <p className="text-xs text-[#5C5C5C]">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-white">{formatKES(order.amount)}</p>
                    <span className={`text-xs ${
                      order.status === 'completed' ? 'text-green-400' :
                      order.status === 'pending_payment' ? 'text-yellow-400' :
                      order.status === 'in_transfer' ? 'text-purple-400' :
                      order.status === 'disputed' ? 'text-red-400' : 'text-[#9E9E9E]'
                    }`}>
                      {order.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {!userProfile?.sellerApproved && !sellerApp?.status && (
          <div className="card border border-[#BF0021]/30 bg-gradient-to-r from-[#1A1A1A] to-[#1A1A1A] p-6">
            <div className="flex items-start gap-4">
              <Shield size={32} style={{ color: '#BF0021' }} className="shrink-0" />
              <div>
                <h3 className="font-heading text-lg font-bold text-white mb-1">Become a Seller</h3>
                <p className="text-sm text-[#9E9E9E] mb-4">
                  List your eFootball accounts and start earning. Join Kenya's premier marketplace for eFootball accounts.
                </p>
                <Link to="/apply-seller" className="btn-primary inline-flex items-center gap-2 text-sm">
                  Apply Now <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {userProfile?.sellerApproved && (
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <Shield size={24} className="text-green-400" />
              <div>
                <h3 className="font-heading text-lg font-bold text-white">Seller Dashboard</h3>
                <p className="text-sm text-[#9E9E9E]">Manage your listings and orders.</p>
              </div>
              <Link to="/transfer-room" className="btn-primary ml-auto shrink-0 text-sm">
                Transfer Room
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
