import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

export default function SellerRoute({ children }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!userProfile?.sellerApproved) {
    toast.error('Seller access required');
    return <Navigate to="/account" replace />;
  }

  return children;
}
