import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [], requiresAuth = true, redirectTo = '/login' }) => {
  const { auth } = useAuth();
  const location = useLocation();

  if (requiresAuth) {
    if (!auth?.isAuthenticated) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(auth?.user?.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  } else {
    if (auth?.isAuthenticated) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;