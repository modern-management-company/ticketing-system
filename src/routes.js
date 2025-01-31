import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Tickets from './components/Tickets';
import Tasks from './components/Tasks';
import Properties from './components/admin/Properties';
import Users from './components/admin/Users';
import PropertySettings from './components/settings/PropertySettings';
import SystemSettings from './components/settings/SystemSettings';
import { useAuth } from './context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
  const { auth } = useAuth();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(auth.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AdminLayout = () => {
  const { auth } = useAuth();
  
  if (auth?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      <Outlet />
    </div>
  );
};

const SettingsLayout = () => {
  const { auth } = useAuth();
  
  if (!['manager', 'super_admin'].includes(auth?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      <Outlet />
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Main Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute roles={['user', 'manager', 'super_admin']}>
            <Navigate to="/dashboard" replace />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute roles={['user', 'manager', 'super_admin']}>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <PrivateRoute roles={['user', 'manager', 'super_admin']}>
            <Tickets />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <PrivateRoute roles={['user', 'manager', 'super_admin']}>
            <Tasks />
          </PrivateRoute>
        }
      />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route
          path="properties"
          element={
            <PrivateRoute roles={['super_admin']}>
              <Properties />
            </PrivateRoute>
          }
        />
        <Route
          path="users"
          element={
            <PrivateRoute roles={['super_admin']}>
              <Users />
            </PrivateRoute>
          }
        />
        <Route index element={<Navigate to="/admin/properties" replace />} />
      </Route>

      {/* Settings Routes */}
      <Route path="/settings" element={<SettingsLayout />}>
        <Route
          path="property"
          element={
            <PrivateRoute roles={['manager', 'super_admin']}>
              <PropertySettings />
            </PrivateRoute>
          }
        />
        <Route
          path="system"
          element={
            <PrivateRoute roles={['super_admin']}>
              <SystemSettings />
            </PrivateRoute>
          }
        />
        <Route 
          index 
          element={
            <Navigate 
              to={`/settings/${auth?.role === 'super_admin' ? 'system' : 'property'}`} 
              replace 
            />
          } 
        />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes; 