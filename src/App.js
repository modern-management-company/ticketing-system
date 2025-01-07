import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import RegisterUser from './components/RegisterUser';
import Login from './components/Login';
import CreateTicket from './components/CreateTicket';
import ViewTickets from './components/ViewTickets';

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
            <li><Link to="/tickets">View Tickets</Link></li>
          </ul>
        </nav>
        <Routes>
          <Route path="/register" element={<RegisterUser />} />
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="/ticket" element={<CreateTicket token={token} />} />
          <Route path="/tickets" element={<ViewTickets token={token} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
