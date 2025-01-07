import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ViewTickets = ({ token }) => {
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await axios.get('/tickets', {
          headers: { Authorization: `Bearer ${token}` }, // Send token in header
        });
        setTickets(response.data.tickets);
      } catch (error) {
        setMessage('Error: ' + (error.response?.data.message || 'Failed to fetch tickets'));
      }
    };

    if (token) {
      fetchTickets();
    } else {
      setMessage('Please log in to view tickets.');
    }
  }, [token]);

  return (
    <div>
      <h2>View Tickets</h2>
      {message && <p>{message}</p>}
      <ul>
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <strong>{ticket.title}</strong> - {ticket.description} (Priority: {ticket.priority}, Status: {ticket.status})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ViewTickets;
