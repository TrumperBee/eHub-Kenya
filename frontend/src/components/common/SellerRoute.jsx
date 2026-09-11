import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

export default function SellerRoute({ children }) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location, message: 'Please log in to continue' }} replace />;
  }
  if (!userProfile?.sellerApproved) {
    toast.error('Seller access required');
    return <Navigate to="/account" replace />;
  }

  return children;
}
