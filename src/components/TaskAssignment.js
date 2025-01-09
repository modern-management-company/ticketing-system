import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

const TaskAssignment = ({ token }) => {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [ticketId, setTicketId] = useState("");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await axios.get("/tickets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTickets(response.data.tickets);
      } catch (error) {
        console.error("Failed to fetch tickets", error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await axios.get("/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data.users);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };

    fetchTickets();
    fetchUsers();
  }, [token]);

  const assignTask = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "/assign-task",
        { ticket_id: ticketId, user_id: userId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage(response.data.message);
      setTicketId("");
      setUserId("");
    } catch (error) {
      console.error("Failed to assign task", error);
      setMessage("Failed to assign task");
    }
  };

  return (
    <Box sx={{ maxWidth: 600, margin: "auto", padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Assign Task
      </Typography>
      <form onSubmit={assignTask}>
        <TextField
          select
          fullWidth
          margin="normal"
          label="Select Ticket"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          required
        >
          {tickets.map((ticket) => (
            <MenuItem key={ticket.id} value={ticket.id}>
              {ticket.title} - {ticket.id}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          margin="normal"
          label="Select User"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        >
          {users.map((user) => (
            <MenuItem key={user.user_id} value={user.user_id}>
              {user.username}
            </MenuItem>
          ))}
        </TextField>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Assign Task
        </Button>
      </form>

      {message && (
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage("")}
        >
          <Alert
            severity={message.includes("successfully") ? "success" : "error"}
            onClose={() => setMessage("")}
          >
            {message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default TaskAssignment;
