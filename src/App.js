import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
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
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername(null);
  };

  const authenticatedNavItems = [
    { label: "Home", path: "/home" },
    { label: "Create Ticket", path: "/ticket" },
    { label: "View Tickets", path: "/tickets" },
    { label: "Add Property", path: "/property" },
    { label: "View Properties", path: "/properties" },
    { label: "View Rooms", path: "/properties/rooms" },
    { label: "Assign Task", path: "/assign-task" },
    { label: "View Tasks", path: "/viewtasks" },
    { label: "View Users", path: "/users" },
    { label: "Reports", path: "/reports" },
  ];

  const toggleDrawer = () => {
    setDrawerOpen((prev) => !prev);
  };

  const renderNavItems = () =>
    authenticatedNavItems.map((item) => (
      <ListItem button key={item.path} component={Link} to={item.path}>
        <ListItemText primary={item.label} />
      </ListItem>
    ));

  return (
    <Router basename="/ticketing-system">
      <Box>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Ticketing System
            </Typography>
            {token ? (
              <>
                <Box sx={{ display: { xs: "none", md: "block" } }}>
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
                  <Button color="inherit" onClick={handleLogout} sx={{ ml: 2 }}>
                    Logout
                  </Button>
                </Box>
                <IconButton
                  sx={{ display: { xs: "block", md: "none" } }}
                  color="inherit"
                  onClick={toggleDrawer}
                >
                  <MenuIcon />
                </IconButton>
              </>
            ) : (
              <Box>
                <Button
                  color="inherit"
                  component={Link}
                  to="/login"
                  sx={{ mr: 1 }}
                >
                  Login
                </Button>
                <Button color="inherit" component={Link} to="/register">
                  Register
                </Button>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        {/* Drawer for mobile navigation */}
        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer}>
          <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer}>
            <List>
              {renderNavItems()}
              <ListItem button onClick={handleLogout}>
                <ListItemText primary="Logout" />
              </ListItem>
            </List>
          </Box>
        </Drawer>

        <Container sx={{ mt: 4 }}>
          <Routes>
            <Route
              path="/login"
              element={
                token ? <Navigate to="/home" /> : <Login setToken={handleSetToken} />
              }
            />
            <Route
              path="/register"
              element={token ? <Navigate to="/home" /> : <RegisterUser />}
            />
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