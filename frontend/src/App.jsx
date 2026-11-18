import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { FridayDropProvider } from './context/FridayDropContext';
import { ADMIN_ROUTE } from './utils/constants';
import { useAuth } from './context/AuthContext';
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
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import ResetPasswordPage from './pages/public/ResetPasswordPage';
import SellerPublicProfilePage from './pages/public/SellerPublicProfilePage';
import SetupUsernamePage from './pages/public/SetupUsernamePage';
import FridayDropsPage from './pages/public/FridayDropsPage';
import PaymentFailedPage from './pages/public/PaymentFailedPage';
import MaintenancePage from './pages/public/MaintenancePage';

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
import PushPermissionBanner from './components/notifications/PushPermissionBanner';
import { isMaintenanceExemptPath, normalizeMaintenanceDoc } from './utils/maintenance';

// Renders the maintenance page for every route except the login page and the
// super admin console (see isMaintenanceExemptPath). While the very first
// snapshot is in flight the app renders nothing at all: the page background
// (white, from index.css) shows through, so there is no coloured flash.
function MaintenanceGate({ maintenance, children }) {
  const location = useLocation();
  if (isMaintenanceExemptPath(location.pathname)) return children;
  if (!maintenance.checked) return null;
  if (maintenance.enabled) return <MaintenancePage message={maintenance.message} />;
  return children;
}

function PageLayout({ children }) {
  const { currentUser } = useAuth();
  return (
    <>
      <Navbar />
      <main className={`w-full max-w-screen overflow-x-hidden min-h-screen animate-fade-in ${currentUser ? 'pb-20 md:pb-0' : ''}`}>{children}</main>
      <Footer />
      {currentUser && <BottomNav />}
    </>
  );
}

function AppContent() {
  const { currentUser, userProfile } = useAuth();
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  // Live maintenance flag. Failures (e.g. a rules change not deployed yet) fail
  // open so a settings read can never take the marketplace down on its own.
  // A 3s fallback also fails open if the first snapshot never arrives, so a slow
  // or blocked connection can never leave the app on a blank screen.
  useEffect(() => {
    const fallback = setTimeout(() => {
      setMaintenanceChecked(true);
      setMaintenanceEnabled(false);
    }, 3000);

    const settle = () => {
      clearTimeout(fallback);
      setMaintenanceChecked(true);
    };

    const unsub = onSnapshot(
      doc(db, 'settings', 'maintenanceMode'),
      (snap) => {
        const state = normalizeMaintenanceDoc(snap.exists() ? snap.data() : null);
        setMaintenanceEnabled(state.enabled);
        setMaintenanceMessage(state.message);
        settle();
      },
      (err) => {
        console.error('Maintenance mode subscription error:', err?.code || err);
        setMaintenanceEnabled(false);
        settle();
      }
    );

    return () => {
      clearTimeout(fallback);
      unsub();
    };
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
        message: 'Friday Drops go live tomorrow at 12:00 AM EAT. Discount one of your listings now.',
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
          <MaintenanceGate
            maintenance={{
              checked: maintenanceChecked,
              enabled: maintenanceEnabled,
              message: maintenanceMessage,
            }}
          >
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="/" element={<PageLayout><HomePage /></PageLayout>} />
            <Route path="/browse" element={<PageLayout><BrowsePage /></PageLayout>} />
            <Route path="/friday-drops" element={<PageLayout><FridayDropsPage /></PageLayout>} />
            <Route path="/listing/:id" element={<PageLayout><ListingDetailPage /></PageLayout>} />
            <Route path="/how-it-works" element={<PageLayout><HowItWorksPage /></PageLayout>} />
            <Route path="/faq" element={<PageLayout><FAQPage /></PageLayout>} />
            <Route path="/seller/:sellerId" element={<PageLayout><SellerPublicProfilePage /></PageLayout>} />
            <Route path="/payment-failed" element={<PageLayout><PaymentFailedPage /></PageLayout>} />
            <Route path="/payment-cancelled" element={<PageLayout><PaymentFailedPage /></PageLayout>} />

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
            <PushPermissionBanner />
          </MaintenanceGate>
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
