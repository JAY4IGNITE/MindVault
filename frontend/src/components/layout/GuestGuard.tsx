import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLoadingScreen } from '../ui/AuthLoadingScreen';

/**
 * GuestGuard prevents authenticated users from seeing login/signup pages,
 * eliminating the flash of login form before redirecting to /dashboard.
 */
export const GuestGuard: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen message="Checking authentication state..." />;
  }

  if (currentUser) {
    // If user's email is not verified, redirect to verify-email
    if (!currentUser.emailVerified) {
      return <Navigate to="/verify-email" replace />;
    }
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
};

export default GuestGuard;
