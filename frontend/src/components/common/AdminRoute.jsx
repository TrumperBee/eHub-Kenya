import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_EMAIL } from '../../utils/constants';
import LoadingSpinner from './LoadingSpinner';

export default function AdminRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen />;

  // SECURITY: unauthenticated visitors are sent to /login (same as every other
  // protected route) instead of the homepage, so the admin console is never
  // reachable without a session.
  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, message: 'Please log in to continue' }}
        replace
      />
    );
  }

  // SECURITY: a valid session is not enough — the verified email must match the
  // configured admin identity. Non-admins go home, never into the console.
  if (currentUser.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;

  return children;
}
