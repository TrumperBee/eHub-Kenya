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
    <div className="pt-16 min-h-screen bg-konami-light-gray">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-extrabold text-konami-text mb-2">
          Welcome back, {userProfile?.displayName || 'Buyer'}
        </h1>
        <p className="text-konami-text-muted mb-8">Manage your purchases and account.</p>

        {sellerApp?.status === 'pending' && (
          <div className="mb-6 flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
            <Clock size={20} className="text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-700">Your seller application is under review.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-konami-text-muted">Total Purchases</p>
              <ShoppingBag size={18} className="text-konami-blue" />
            </div>
            <p className="font-heading text-2xl font-bold text-konami-text">{orders.length}</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-konami-text-muted">In Progress</p>
              <Loader size={18} className="text-yellow-500" />
            </div>
            <p className="font-heading text-2xl font-bold text-konami-text">{inProgress.length}</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-konami-text-muted">Completed</p>
              <CheckCircle size={18} className="text-green-500" />
            </div>
            <p className="font-heading text-2xl font-bold text-konami-text">{completedCount}</p>
          </div>
        </div>

        <div className="card mb-8">
          <div className="p-5 border-b border-konami-mid-gray flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-konami-text">Recent Orders</h2>
            {orders.length > 0 && (
              <Link to="/orders" className="text-sm text-konami-blue hover:text-konami-blue-hover transition-colors">
                View All
              </Link>
            )}
          </div>

          {loadingOrders ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-transparent border-t-konami-blue rounded-full animate-spin" style={{ borderRightColor: '#003BFF' }} />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag size={40} className="mx-auto mb-3 text-konami-text-muted" />
              <p className="text-konami-text-dim mb-4">No orders yet. Browse accounts to get started.</p>
              <Link to="/browse" className="btn-primary inline-flex items-center gap-2">
                Browse Accounts <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-konami-mid-gray">
              {orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-konami-light-gray transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-konami-text truncate">{order.listingTitle}</p>
                    <p className="text-xs text-konami-text-muted">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-konami-text">{formatKES(order.amount)}</p>
                    <span className={`text-xs ${
                      order.status === 'completed' ? 'text-green-500' :
                      order.status === 'pending_payment' ? 'text-yellow-600' :
                      order.status === 'in_transfer' ? 'text-purple-500' :
                      order.status === 'disputed' ? 'text-konami-red' : 'text-konami-text-dim'
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
          <div className="card p-6 border-t-4 border-t-konami-yellow">
            <div className="flex items-start gap-4">
              <Shield size={32} className="text-konami-blue shrink-0" />
              <div>
                <h3 className="font-heading text-lg font-bold text-konami-text mb-1">Become a Seller</h3>
                <p className="text-sm text-konami-text-muted mb-4">
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
              <Shield size={24} className="text-green-500" />
              <div>
                <h3 className="font-heading text-lg font-bold text-konami-text">Seller Dashboard</h3>
                <p className="text-sm text-konami-text-muted">Manage your listings and orders.</p>
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
