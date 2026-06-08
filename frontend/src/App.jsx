import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ADMIN_ROUTE } from './utils/constants';
import { useAuth } from './context/AuthContext';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import BottomNav from './components/common/BottomNav';
import LoadingScreen from './components/common/LoadingScreen';
import ProtectedRoute from './components/common/ProtectedRoute';
import SellerRoute from './components/common/SellerRoute';
import AdminRoute from './components/common/AdminRoute';

import HomePage from './pages/public/HomePage';
import BrowsePage from './pages/public/BrowsePage';
import ListingDetailPage from './pages/public/ListingDetailPage';
import HowItWorksPage from './pages/public/HowItWorksPage';
import FAQPage from './pages/public/FAQPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

import BuyerDashboardPage from './pages/buyer/BuyerDashboardPage';
import MyOrdersPage from './pages/buyer/MyOrdersPage';
import OrderDetailPage from './pages/buyer/OrderDetailPage';
import ProfilePage from './pages/buyer/ProfilePage';

import TransferRoomPage from './pages/seller/TransferRoomPage';
import CreateListingPage from './pages/seller/CreateListingPage';
import EditListingPage from './pages/seller/EditListingPage';
import SellerOrdersPage from './pages/seller/SellerOrdersPage';
import SellerEarningsPage from './pages/seller/SellerEarningsPage';
import SellerProfilePage from './pages/seller/SellerProfilePage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';
import AdminSellersPage from './pages/admin/AdminSellersPage';
import AdminListingsPage from './pages/admin/AdminListingsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminDisputesPage from './pages/admin/AdminDisputesPage';

import SellerApplicationPage from './pages/SellerApplicationPage';

function PageLayout({ children }) {
  const { currentUser } = useAuth();
  return (
    <>
      <Navbar />
      <main className={`min-h-screen animate-page-in ${currentUser ? 'pb-16 md:pb-0' : ''}`}>{children}</main>
      <Footer />
      {currentUser && <BottomNav />}
    </>
  );
}

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    if (initDone) return;
    const timer = setTimeout(() => setInitDone(true), 2000);
    return () => clearTimeout(timer);
  }, [initDone]);

  const showLoader = loading || !initDone;

  return (
    <>
      <LoadingScreen show={showLoader} />
      <div style={{ display: showLoader ? 'none' : 'block' }}>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#003BFF',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontFamily: 'Inter, sans-serif',
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/" element={<PageLayout><HomePage /></PageLayout>} />
            <Route path="/browse" element={<PageLayout><BrowsePage /></PageLayout>} />
            <Route path="/listing/:id" element={<PageLayout><ListingDetailPage /></PageLayout>} />
            <Route path="/how-it-works" element={<PageLayout><HowItWorksPage /></PageLayout>} />
            <Route path="/faq" element={<PageLayout><FAQPage /></PageLayout>} />

            <Route path="/apply-seller" element={
              <PageLayout><ProtectedRoute><SellerApplicationPage /></ProtectedRoute></PageLayout>
            } />

            <Route path="/account" element={
              <PageLayout><ProtectedRoute><BuyerDashboardPage /></ProtectedRoute></PageLayout>
            } />
            <Route path="/orders" element={
              <PageLayout><ProtectedRoute><MyOrdersPage /></ProtectedRoute></PageLayout>
            } />
            <Route path="/orders/:id" element={
              <PageLayout><ProtectedRoute><OrderDetailPage /></ProtectedRoute></PageLayout>
            } />
            <Route path="/profile" element={
              <PageLayout><ProtectedRoute><ProfilePage /></ProtectedRoute></PageLayout>
            } />

            <Route path="/transfer-room" element={
              <PageLayout><SellerRoute><TransferRoomPage /></SellerRoute></PageLayout>
            } />
            <Route path="/transfer-room/new" element={
              <PageLayout><SellerRoute><CreateListingPage /></SellerRoute></PageLayout>
            } />
            <Route path="/transfer-room/edit/:id" element={
              <PageLayout><SellerRoute><EditListingPage /></SellerRoute></PageLayout>
            } />
            <Route path="/transfer-room/orders" element={
              <PageLayout><SellerRoute><SellerOrdersPage /></SellerRoute></PageLayout>
            } />
            <Route path="/transfer-room/earnings" element={
              <PageLayout><SellerRoute><SellerEarningsPage /></SellerRoute></PageLayout>
            } />
            <Route path="/transfer-room/profile" element={
              <PageLayout><SellerRoute><SellerProfilePage /></SellerRoute></PageLayout>
            } />

            <Route path={ADMIN_ROUTE} element={
              <PageLayout><AdminRoute><AdminDashboardPage /></AdminRoute></PageLayout>
            } />
            <Route path={`${ADMIN_ROUTE}/applications`} element={
              <PageLayout><AdminRoute><AdminApplicationsPage /></AdminRoute></PageLayout>
            } />
            <Route path={`${ADMIN_ROUTE}/sellers`} element={
              <PageLayout><AdminRoute><AdminSellersPage /></AdminRoute></PageLayout>
            } />
            <Route path={`${ADMIN_ROUTE}/listings`} element={
              <PageLayout><AdminRoute><AdminListingsPage /></AdminRoute></PageLayout>
            } />
            <Route path={`${ADMIN_ROUTE}/orders`} element={
              <PageLayout><AdminRoute><AdminOrdersPage /></AdminRoute></PageLayout>
            } />
            <Route path={`${ADMIN_ROUTE}/users`} element={
              <PageLayout><AdminRoute><AdminUsersPage /></AdminRoute></PageLayout>
            } />
            <Route path={`${ADMIN_ROUTE}/disputes`} element={
              <PageLayout><AdminRoute><AdminDisputesPage /></AdminRoute></PageLayout>
            } />

            <Route path="*" element={<PageLayout><HomePage /></PageLayout>} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
