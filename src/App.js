import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import {
  Box,
  Container,
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
import UnauthorizedPage from "./components/UnauthorizedPage";

const theme = createTheme();

const PrivateRoute = ({ children }) => {
  const { auth } = useAuth();
  return auth ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { auth } = useAuth();
  return auth?.role === 'super_admin' ? children : <Navigate to="/dashboard" />;
};

const ManagerRoute = ({ children }) => {
  const { auth } = useAuth();
  return auth?.role === 'manager' || auth?.role === 'super_admin' ? 
    children : <Navigate to="/dashboard" />;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegisterUser />} />
              <Route path="/" element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
                <Route index element={<Navigate to="/dashboard" />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="tickets">
                  <Route index element={<ViewTickets />} />
                  <Route path="create" element={<CreateTicket />} />
                </Route>
                <Route path="tasks" element={<ViewTasks />} />
                <Route path="rooms" element={<ViewRooms />} />
                <Route path="users" element={
                  <ManagerRoute>
                    <ManageUsers />
                  </ManagerRoute>
                } />
                <Route path="properties" element={
                  <ManagerRoute>
                    <ManageProperties />
                  </ManagerRoute>
                } />
              </Route>
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;