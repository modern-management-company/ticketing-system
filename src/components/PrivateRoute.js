import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children, requiredRole = null }) => {
  const { auth } = useAuth();
  const location = useLocation();

  if (!auth) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && auth.user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PrivateRoute; 