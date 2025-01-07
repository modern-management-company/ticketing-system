import React, { useState } from 'react';
import axios from 'axios';

const CreateTicket = ({ token }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Low');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        '/tickets',
        { title, description, priority },
        { headers: { Authorization: `Bearer ${token}` } } // Send token in header
      );
      setMessage(response.data.message);
      setTitle('');
      setDescription('');
      setPriority('Low');
    } catch (error) {
      setMessage('Error: ' + (error.response?.data.message || 'Ticket creation failed'));
    }
  };

  return (
    <div>
      <h2>Create Ticket</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          ></textarea>
        </div>
        <div>
          <label>Priority:</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <button type="submit">Create Ticket</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default CreateTicket;
