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
import ManageProperties from './components/ManageProperties';
import ViewRooms from './components/ViewRooms';
import ViewTasks from './components/ViewTasks';
import CreateTicket from './components/CreateTicket';
import ViewTickets from './components/ViewTickets';
import HomeOverview from './components/HomeOverview';
import PropertySettings from './components/settings/PropertySettings';
import SystemSettings from './components/settings/SystemSettings';
import Unauthorized from './components/Unauthorized';
import UserProfile from './components/UserProfile';
import TicketDetails from './components/TicketDetails';
import PropertyManagement from './components/PropertyManagement';

const AdminLayout = () => {
  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <Outlet />
    </ProtectedRoute>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterUser />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes */}
            <Route element={<Layout />}>
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
              <Route path="/tickets/create" element={
                <ProtectedRoute>
                  <CreateTicket />
                </ProtectedRoute>
              } />
              <Route path="/tickets/:ticketId" element={
                <ProtectedRoute>
                  <TicketDetails />
                </ProtectedRoute>
              } />
              
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <ViewTasks />
                </ProtectedRoute>
              } />
              
              <Route path="/rooms" element={
                <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                  <ViewRooms />
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
              </Route>
              
              <Route path="/settings">
                <Route path="property" element={
                  <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
                    <PropertySettings />
                  </ProtectedRoute>
                } />
                <Route path="system" element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <SystemSettings />
                  </ProtectedRoute>
                } />
              </Route>
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } />
              
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
            
            {/* Default route */}
            <Route path="*" element={<Unauthorized />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;