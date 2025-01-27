import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import Navbar from './components/Navbar';

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

const theme = createTheme();

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterUser />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<HomeOverview />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tickets">
                <Route index element={<ViewTickets />} />
                <Route path="create" element={<CreateTicket />} />
              </Route>
              <Route path="tasks" element={<ViewTasks />} />
              <Route path="rooms" element={<ViewRooms />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="properties" element={<ManageProperties />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;