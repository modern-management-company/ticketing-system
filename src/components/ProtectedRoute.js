import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { auth } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - Current auth:', auth);
  console.log('ProtectedRoute - Allowed roles:', allowedRoles);

  if (!auth) {
    console.log('ProtectedRoute - No auth, redirecting to login');
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(auth.role)) {
    console.log('ProtectedRoute - User role not allowed:', auth.role);
    // Redirect to home if not authorized for this route
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;