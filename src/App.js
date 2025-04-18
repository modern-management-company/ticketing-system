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
} from '@mui/material';
import theme from './theme';

// Import components
import Login from "./components/Login";
import RegisterUser from "./components/RegisterUser";
import Dashboard from "./components/Dashboard";
import ManageUsers from './components/ManageUsers';
import ViewTasks from './components/ViewTasks';
import ViewTickets from './components/ViewTickets';
import ViewTicket from './components/ViewTicket';
import ViewRooms from './components/ViewRooms';
import PropertyManagement from './components/PropertyManagement';
import Unauthorized from './components/Unauthorized';
import Reports from './components/Reports';
import HomeOverview from './components/HomeOverview';
import EmailSettings from './components/EmailSettings';
import SMSSettings from './components/SMSSettings';
import AttachmentSettings from './components/AttachmentSettings';
import SystemSettings from './components/SystemSettings';
import ServiceRequests from './components/ServiceRequests';
import Welcome from './components/Welcome';
import ViewTask from './components/ViewTask';
import HistoryView from './components/HistoryView';
import Pricing from './components/Pricing';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Welcome page - redirect to /home if authenticated */}
            <Route path="/" element={
              <ProtectedRoute requiresAuth={false} redirectTo="/home">
                <Welcome />
              </ProtectedRoute>
            } />

            {/* Public routes - redirect to /home if authenticated */}
            <Route path="/login" element={
              <ProtectedRoute requiresAuth={false} redirectTo="/home">
                <Login />
              </ProtectedRoute>
            } />
            <Route path="/register" element={
              <ProtectedRoute requiresAuth={false} redirectTo="/home">
                <RegisterUser />
              </ProtectedRoute>
            } />
            <Route path="/register-admin" element={
              <ProtectedRoute requiresAuth={false} redirectTo="/home">
                <RegisterUser isAdminRegistration={true} />
              </ProtectedRoute>
            } />
            <Route path="/pricing" element={
              <ProtectedRoute requiresAuth={false} redirectTo="/home">
                <Pricing />
              </ProtectedRoute>
            } />
            
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes */}
            <Route element={<Layout />}>
              <Route path="/home" element={
                <ProtectedRoute>
                  <HomeOverview />
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/tickets" element={
                <ProtectedRoute>
                  <ViewTickets />
                </ProtectedRoute>
              } />
              
              <Route path="/tickets/:ticketId" element={
                <ProtectedRoute>
                  <ViewTicket />
                </ProtectedRoute>
              } />
              
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <ViewTasks />
                </ProtectedRoute>
              } />

              <Route path="/rooms" element={
                <ProtectedRoute>
                  <ViewRooms />
                </ProtectedRoute>
              } />

              <Route path="/requests" element={
                <ProtectedRoute>
                  <ServiceRequests />
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                  <Reports />
                </ProtectedRoute>
              } />
              
              <Route path="/tasks/:taskId" element={
                <ProtectedRoute>
                  <ViewTask />
                </ProtectedRoute>
              } />
              
              <Route path="/admin">
                <Route path="properties" element={
                  <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                    <PropertyManagement />
                  </ProtectedRoute>
                } />
                <Route path="users" element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <ManageUsers />
                  </ProtectedRoute>
                } />
                <Route path="history" element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <HistoryView />
                  </ProtectedRoute>
                } />
                <Route path="system-settings" element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <SystemSettings />
                  </ProtectedRoute>
                } />
              </Route>
            </Route>
            
            {/* Redirect any unknown routes to /home if authenticated, / if not */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;