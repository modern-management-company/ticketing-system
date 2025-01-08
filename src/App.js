import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import RegisterUser from './components/RegisterUser';
import Login from './components/Login';
import CreateTicket from './components/CreateTicket';
import ViewTickets from './components/ViewTickets'; // Import ViewTickets
import PropertyForm from './components/PropertyForm';
import RoomForm from './components/RoomForm';
import TaskAssignment from './components/TaskAssignment';
import ViewTasks from './components/ViewTasks'; // Import ViewTasks
import ViewUsers from './components/ViewUsers';
import ViewProperties from './components/ViewProperties';
import ViewRooms from './components/ViewRooms';
import ReportView from "./components/ReportView";

function App() {
  const [token, setToken] = useState(null);

  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li><Link to="/register">Register User</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/ticket">Create Ticket</Link></li>
            <li><Link to="/property">Add Property</Link></li>
            <li><Link to="/property/1/room">Add Room</Link></li>
            <li><Link to="/assign-task">Assign Task</Link></li>
            <li><Link to="/tickets">View Tickets</Link></li> {/* Link for ViewTickets */}
            <li><Link to="/viewtasks">View Task Details</Link></li> {/* Link for ViewTasks */}
            <li><Link to="/users">View Users</Link></li>
            <li><Link to="/properties">View Properties</Link></li>
            <li><Link to="/properties/rooms">View Rooms</Link></li>
            <li><Link to="/reports">Reports</Link></li>
          </ul>
        </nav>
        <Routes>
          <Route path="/register" element={<RegisterUser />} />
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="/ticket" element={<CreateTicket token={token} />} />
          <Route path="/tickets" element={<ViewTickets token={token} />} /> {/* Route for ViewTickets */}
          <Route path="/property" element={<PropertyForm token={token} />} />
          <Route path="/property/:propertyId/room" element={<RoomForm token={token} propertyId={1} />} />
          <Route path="/assign-task" element={<TaskAssignment token={token} />} />
          <Route path="/viewtasks" element={<ViewTasks token={token} />} /> {/* Route for ViewTasks */}
          <Route path="/users" element={<ViewUsers token={token} />} />
          <Route path="/properties" element={<ViewProperties token={token} />} />
          <Route path="/properties/rooms" element={<ViewRooms token={token} />} />
          <Route path="/reports" element={<ReportView token={token} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
