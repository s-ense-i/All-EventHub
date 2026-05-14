import { Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { isPendingOrganizer } from '../utils/accountStatus';

export default function PendingAccountGate({ children }) {
  const location = useLocation();
  const { isAuthenticated, user } = useContext(AuthContext);

  const allowPendingOrganizerAccess =
    location.pathname === '/my-events' ||
    location.pathname.startsWith('/edit-event/') ||
    location.pathname === '/organizer-dashboard';

  if (isAuthenticated && isPendingOrganizer(user) && location.pathname !== '/account-pending' && !allowPendingOrganizerAccess) {
    return <Navigate to="/account-pending" replace />;
  }

  return children;
}