import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Grid,
} from "@mui/material";
import RegisterUser from "./components/RegisterUser";
import Login from "./components/Login";
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
import HomeOverview from "./components/HomeOverview"; // New Home component

function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
  };

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
                <Typography variant="subtitle1" sx={{ marginRight: 2 }}>
                  Hi, {username}
                </Typography>
                <Button color="inherit" component={Link} to="/home">
                  Home
                </Button>
                <Button color="inherit" component={Link} to="/ticket">
                  Create Ticket
                </Button>
                <Button color="inherit" component={Link} to="/property">
                  Add Property
                </Button>
                <Button color="inherit" component={Link} to="/assign-task">
                  Assign Task
                </Button>
                <Button color="inherit" component={Link} to="/tickets">
                  View Tickets
                </Button>
                <Button color="inherit" component={Link} to="/viewtasks">
                  View Tasks
                </Button>
                <Button color="inherit" component={Link} to="/users">
                  View Users
                </Button>
                <Button color="inherit" component={Link} to="/properties">
                  View Properties
                </Button>
                <Button color="inherit" component={Link} to="/properties/rooms">
                  View Rooms
                </Button>
                <Button color="inherit" component={Link} to="/reports">
                  Reports
                </Button>
                <Button color="inherit" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button color="inherit" component={Link} to="/login">
                Login
              </Button>
            )}
          </Toolbar>
        </AppBar>

        <Container sx={{ marginTop: 4 }}>
          <Routes>
            <Route
              path="/login"
              element={
                token ? (
                  <Navigate to="/home" />
                ) : (
                  <Login
                    setToken={(token, user) => {
                      setToken(token);
                      setUsername(user);
                    }}
                  />
                )
              }
            />
            <Route
              path="/register"
              element={token ? <Navigate to="/home" /> : <RegisterUser />}
            />
            {token ? (
              <>
                <Route path="/home" element={<HomeOverview />} />
                <Route path="/ticket" element={<CreateTicket token={token} />} />
                <Route path="/tickets" element={<ViewTickets token={token} />} />
                <Route path="/property" element={<PropertyForm token={token} />} />
                <Route
                  path="/property/:propertyId/room"
                  element={<RoomForm token={token} />}
                />
                <Route
                  path="/assign-task"
                  element={<TaskAssignment token={token} />}
                />
                <Route path="/viewtasks" element={<ViewTasks token={token} />} />
                <Route path="/users" element={<ViewUsers token={token} />} />
                <Route
                  path="/properties"
                  element={<ViewProperties token={token} />}
                />
                <Route
                  path="/properties/rooms"
                  element={<ViewRooms token={token} />}
                />
                <Route path="/reports" element={<ReportView token={token} />} />
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
