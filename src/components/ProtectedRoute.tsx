import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext, Role } from '../context';

interface ProtectedRouteProps {
  // Changed from Role[] to string[] so it accepts the new backend Identity strings
  allowedRoles: string[]; 
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user } = useAppContext();

  // 1. Not logged in at all? Redirect to the login page.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Logged in, but lacking the required role? Redirect to a safe fallback.
  if (!allowedRoles.includes(user.role)) {
    // Citizens go to their portal; everyone else falls back to the main dashboard
    const fallbackRoute = user.role.toLowerCase() === 'citizen' ? '/citizen' : '/dashboard';
    return <Navigate to={fallbackRoute} replace />;
  }

  // 3. Authorized? Render the child components (or the nested routes via Outlet).
  return children ? <>{children}</> : <Outlet />;
}