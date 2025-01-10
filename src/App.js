import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from "@mui/material";

// Import your components here
import HomeOverview from "./components/HomeOverview";
import Login from "./components/Login";
import RegisterUser from "./components/RegisterUser";
import CreateTicket from "./components/CreateTicket";
import ViewTickets from "./components/ViewTickets";
import PropertyForm from "./components/PropertyForm";
import RoomForm from "./components/RoomForm";
import TaskAssignment from "./components/TaskAssignment";
import ViewTasks from "./components/ViewTasks";
import ViewUsers from "./components/ViewUsers";
import ViewProperties from "./components/ViewProperties";
import ViewRooms from "./components/ViewRooms";
import ReportView from "./components/ReportView";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
    
    console.log('Auth state check:', {
      hasToken: !!storedToken,
      hasUsername: !!storedUsername
    });

    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUsername(storedUsername);
    }
  }, []);

  const handleSetToken = (newToken, newUsername) => {
    if (newToken && newUsername) {
      localStorage.setItem("token", newToken);
      localStorage.setItem("username", newUsername);
      setToken(newToken);
      setUsername(newUsername);
      console.log('Token set:', { username: newUsername });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername(null);
    console.log('Logged out');
  };

  // Navigation items when logged in
  const authenticatedNavItems = [
    { label: 'Home', path: '/home' },
    { label: 'Create Ticket', path: '/ticket' },
    { label: 'View Tickets', path: '/tickets' },
    { label: 'Add Property', path: '/property' },
    { label: 'View Properties', path: '/properties' },
    { label: 'View Rooms', path: '/properties/rooms' },
    { label: 'Assign Task', path: '/assign-task' },
    { label: 'View Tasks', path: '/viewtasks' },
    { label: 'View Users', path: '/users' },
    { label: 'Reports', path: '/reports' },
  ];

  return (
    <Router>
      <Box>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Ticketing System
            </Typography>
            
            {token ? (
              <>
                {/* Show navigation items when logged in */}
                {authenticatedNavItems.map((item) => (
                  <Button
                    key={item.path}
                    color="inherit"
                    component={Link}
                    to={item.path}
                    sx={{ mx: 0.5 }}
                  >
                    {item.label}
                  </Button>
                ))}
                
                {/* User info and logout */}
                <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ mr: 2 }}>
                    {username}
                  </Typography>
                  <Button 
                    color="inherit"
                    onClick={handleLogout}
                    variant="outlined"
                    sx={{ ml: 1 }}
                  >
                    Logout
                  </Button>
                </Box>
              </>
            ) : (
              // Show login/register when logged out
              <Box>
                <Button
                  color="inherit"
                  component={Link}
                  to="/login"
                  sx={{ mr: 1 }}
                >
                  Login
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/register"
                >
                  Register
                </Button>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <Container sx={{ mt: 4 }}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                token ? (
                  <Navigate to="/home" />
                ) : (
                  <Login setToken={handleSetToken} />
                )
              }
            />
            <Route
              path="/register"
              element={
                token ? <Navigate to="/home" /> : <RegisterUser />
              }
            />

            {/* Protected routes */}
            {token ? (
              <>
                <Route path="/home" element={<HomeOverview token={token} />} />
                <Route path="/ticket" element={<CreateTicket token={token} />} />
                <Route path="/tickets" element={<ViewTickets token={token} />} />
                <Route path="/property" element={<PropertyForm token={token} />} />
                <Route path="/property/:propertyId/room" element={<RoomForm token={token} />} />
                <Route path="/assign-task" element={<TaskAssignment token={token} />} />
                <Route path="/viewtasks" element={<ViewTasks token={token} />} />
                <Route path="/users" element={<ViewUsers token={token} />} />
                <Route path="/properties" element={<ViewProperties token={token} />} />
                <Route path="/properties/rooms" element={<ViewRooms token={token} />} />
                <Route path="/reports" element={<ReportView token={token} />} />
                <Route path="/" element={<Navigate to="/home" />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/login" />} />
            )}
          </Routes>
        </Container>
      </Box>
    </Router>
  );
}

export default App;