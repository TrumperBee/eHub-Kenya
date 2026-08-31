import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { FridayDropProvider } from './context/FridayDropContext';
import { ADMIN_ROUTE } from './utils/constants';
import { useAuth } from './context/AuthContext';
import { seedStatsIfMissing } from './services/statsService';
import { db } from './services/firebase';
import { getEATDay, getEATYear, getWeekNumber, isDropLive } from './utils/fridayUtils';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import BottomNav from './components/common/BottomNav';

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
import SellerPublicProfilePage from './pages/public/SellerPublicProfilePage';
import SetupUsernamePage from './pages/public/SetupUsernamePage';
import FridayDropsPage from './pages/public/FridayDropsPage';

import BuyerDashboardPage from './pages/buyer/BuyerDashboardPage';
import MyOrdersPage from './pages/buyer/MyOrdersPage';
import OrderDetailPage from './pages/buyer/OrderDetailPage';
import AccountPage from './pages/buyer/AccountPage';
import SavedListingsPage from './pages/buyer/SavedListingsPage';

import TransferRoomPage from './pages/seller/TransferRoomPage';
import CreateListingPage from './pages/seller/CreateListingPage';
import EditListingPage from './pages/seller/EditListingPage';


import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';
import AdminSellersPage from './pages/admin/AdminSellersPage';
import AdminListingsPage from './pages/admin/AdminListingsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminDisputesPage from './pages/admin/AdminDisputesPage';
import AdminFridayDropsPage from './pages/admin/AdminFridayDropsPage';

import SellerApplicationPage from './pages/SellerApplicationPage';
import AIAssistant from './components/ai/AIAssistant';

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
  const { currentUser, userProfile, loading } = useAuth();

  useEffect(() => {
    seedStatsIfMissing();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const now = new Date();
    const year = getEATYear(now);
    const weekNum = getWeekNumber(now);

    const trySend = async (key, payload) => {
      if (localStorage.getItem(key)) return;
      try {
        await addDoc(collection(db, 'notifications'), {
          ...payload,
          orderId: null,
          read: false,
          createdAt: serverTimestamp(),
        });
        localStorage.setItem(key, '1');
      } catch (err) {
        console.warn('Drop notification error:', err.code);
      }
    };

    const eatDay = getEATDay(now);

    if (eatDay === 4 && userProfile?.sellerApproved) {
      trySend(`drop_reminder_${year}_${weekNum}`, {
        userId: currentUser.uid,
        title: 'Friday Drops: Submit Deals!',
        message: 'Friday Drops go live tomorrow at 12:00 EAT. Discount one of your listings now.',
        type: 'drop',
        link: '/transfer-room',
      });
    }

    if (eatDay === 5 && isDropLive(now)) {
      trySend(`drop_alert_${year}_${weekNum}`, {
        userId: currentUser.uid,
        title: 'Friday Drops Are Live!',
        message: 'This week\u2019s discounts are unlocked. Grab verified accounts at slashed prices before they sell out.',
        type: 'drop',
        link: '/friday-drops',
      });
    }
  }, [currentUser, userProfile?.sellerApproved]);

  return (
    <>
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
            <Route path="/friday-drops" element={<PageLayout><FridayDropsPage /></PageLayout>} />
            <Route path="/listing/:id" element={<PageLayout><ListingDetailPage /></PageLayout>} />
            <Route path="/how-it-works" element={<PageLayout><HowItWorksPage /></PageLayout>} />
            <Route path="/faq" element={<PageLayout><FAQPage /></PageLayout>} />
            <Route path="/seller/:sellerId" element={<PageLayout><SellerPublicProfilePage /></PageLayout>} />

            <Route path="/setup-username" element={
              <ProtectedRoute><SetupUsernamePage /></ProtectedRoute>
            } />

            <Route path="/apply-seller" element={
              <PageLayout><ProtectedRoute><SellerApplicationPage /></ProtectedRoute></PageLayout>
            } />

            <Route path="/dashboard" element={
              <PageLayout><ProtectedRoute><BuyerDashboardPage /></ProtectedRoute></PageLayout>
            } />
            <Route path="/orders" element={
              <PageLayout><ProtectedRoute><MyOrdersPage /></ProtectedRoute></PageLayout>
            } />
            <Route path="/orders/:id" element={
              <PageLayout><ProtectedRoute><OrderDetailPage /></ProtectedRoute></PageLayout>
            } />
            <Route path="/account" element={
              <PageLayout><ProtectedRoute><AccountPage /></ProtectedRoute></PageLayout>
            } />
            <Route path="/saved" element={
              <PageLayout><ProtectedRoute><SavedListingsPage /></ProtectedRoute></PageLayout>
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
            <Route path={`${ADMIN_ROUTE}/friday-drops`} element={
              <PageLayout><AdminRoute><AdminFridayDropsPage /></AdminRoute></PageLayout>
            } />
            <Route path={`${ADMIN_ROUTE}/users`} element={
              <PageLayout><AdminRoute><AdminUsersPage /></AdminRoute></PageLayout>
            } />
            <Route path={`${ADMIN_ROUTE}/disputes`} element={
              <PageLayout><AdminRoute><AdminDisputesPage /></AdminRoute></PageLayout>
            } />

            <Route path="*" element={<PageLayout><HomePage /></PageLayout>} />
          </Routes>
          <AIAssistant />
        </BrowserRouter>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <FridayDropProvider>
          <AppContent />
        </FridayDropProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
