import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet
} from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';

// Import your components
import Login from "./components/Login";
import RegisterUser from "./components/RegisterUser";
import Dashboard from "./components/Dashboard";
import ManageUsers from './components/ManageUsers';
import ManageProperties from './components/ManageProperties';
import ViewRooms from './components/ViewRooms';
import ViewTasks from './components/ViewTasks';
import CreateTicket from './components/CreateTicket';
import ViewTickets from './components/ViewTickets';
import HomeOverview from './components/HomeOverview';
import PropertySettings from './components/settings/PropertySettings';
import SystemSettings from './components/settings/SystemSettings';

const theme = createTheme();

// Admin Layout component
const AdminLayout = () => {
  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <Outlet />
    </ProtectedRoute>
  );
};

// Settings Layout component
const SettingsLayout = () => {
  return (
    <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
      <Outlet />
    </ProtectedRoute>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterUser />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<HomeOverview />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Ticket routes */}
              <Route path="tickets">
                <Route index element={<ViewTickets />} />
                <Route path="create" element={<CreateTicket />} />
              </Route>
              
              {/* Task routes */}
              <Route path="tasks" element={<ViewTasks />} />
              
              {/* Manager and Admin only routes */}
              <Route path="rooms" element={
                <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                  <ViewRooms />
                </ProtectedRoute>
              } />
              
              {/* Admin routes */}
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="properties" replace />} />
                <Route path="users" element={<ManageUsers />} />
                <Route path="properties" element={<ManageProperties />} />
              </Route>

              {/* Settings routes */}
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="property" replace />} />
                <Route path="property" element={<PropertySettings />} />
                <Route 
                  path="system" 
                  element={
                    <ProtectedRoute allowedRoles={['super_admin']}>
                      <SystemSettings />
                    </ProtectedRoute>
                  } 
                />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;