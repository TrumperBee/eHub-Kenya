import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_EMAIL } from '../../utils/constants';
import LoadingSpinner from './LoadingSpinner';

export default function AdminRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!currentUser || currentUser.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;

  return children;
}
