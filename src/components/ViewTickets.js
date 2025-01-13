import React, { useEffect, useState } from "react";
import apiClient from "./apiClient";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Button,
  TextField,
} from "@mui/material";

const ViewTickets = ({ token }) => {
  const [tickets, setTickets] = useState([]);
  const [editTicket, setEditTicket] = useState({});
  const [message, setMessage] = useState("");

  // Fetch tickets on component mount
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await apiClient.get("/tickets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTickets(response.data.tickets);
      } catch (error) {
        console.error("Failed to fetch tickets", error);
        setMessage("Failed to fetch tickets");
      }
    };

    fetchTickets();
  }, [token]);

  // Handle edit ticket
  const handleEdit = async (ticketId) => {
    try {
      const currentTicket = tickets.find(t => t.id === ticketId);
      
      // Create payload with current values
      const payload = {
        title: editTicket.title !== undefined ? editTicket.title : currentTicket.title,
        description: editTicket.description !== undefined ? editTicket.description : currentTicket.description,
        priority: editTicket.priority !== undefined ? editTicket.priority : currentTicket.priority,
        category: editTicket.category !== undefined ? editTicket.category : currentTicket.category,
        status: editTicket.status !== undefined ? editTicket.status : currentTicket.status
      };

      console.log("Sending update with payload:", payload);

      const response = await apiClient.patch(
        `/tickets/${ticketId}`,
        payload,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      // Update local state after successful server update
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === ticketId 
            ? { ...ticket, ...payload }
            : ticket
        )
      );

      setMessage(response.data.message);
      setEditTicket({});
    } catch (error) {
      console.error("Update failed:", error);
      setMessage(error.response?.data?.message || "Failed to update ticket");
    }
  };

  // Handle delete ticket
  const handleDelete = async (ticketId) => {
    try {
      const response = await apiClient.delete(`/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(response.data.message);
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
    } catch (error) {
      console.error("Failed to delete ticket", error);
      setMessage("Failed to delete ticket");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        View Tickets
      </Typography>
      {message && (
        <Typography 
          color={message.includes("Failed") ? "error" : "success"} 
          sx={{ mb: 2 }}
        >
          {message}
        </Typography>
      )}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Ticket ID</TableCell>
              <TableCell align="center">Title</TableCell>
              <TableCell align="center">Description</TableCell>
              <TableCell align="center">Priority</TableCell>
              <TableCell align="center">Category</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell align="center">{ticket.id}</TableCell>
                <TableCell align="center">
                  {editTicket.id === ticket.id ? (
                    <TextField
                      fullWidth
                      value={editTicket.title !== undefined ? editTicket.title : ticket.title}
                      onChange={(e) => {
                        setEditTicket({
                          ...editTicket,
                          id: ticket.id,
                          title: e.target.value,
                        });
                      }}
                    />
                  ) : (
                    ticket.title
                  )}
                </TableCell>
                <TableCell align="center">
                  {editTicket.id === ticket.id ? (
                    <TextField
                      fullWidth
                      multiline
                      value={editTicket.description !== undefined ? editTicket.description : ticket.description}
                      onChange={(e) => {
                        setEditTicket({
                          ...editTicket,
                          id: ticket.id,
                          description: e.target.value,
                        });
                      }}
                    />
                  ) : (
                    ticket.description
                  )}
                </TableCell>
                <TableCell align="center">
                  {editTicket.id === ticket.id ? (
                    <Select
                      fullWidth
                      value={editTicket.priority !== undefined ? editTicket.priority : ticket.priority}
                      onChange={(e) => {
                        setEditTicket({
                          ...editTicket,
                          id: ticket.id,
                          priority: e.target.value,
                        });
                      }}
                    >
                      <MenuItem value="Low">Low</MenuItem>
                      <MenuItem value="Medium">Medium</MenuItem>
                      <MenuItem value="High">High</MenuItem>
                    </Select>
                  ) : (
                    ticket.priority
                  )}
                </TableCell>
                <TableCell align="center">
                  {editTicket.id === ticket.id ? (
                    <Select
                      fullWidth
                      value={editTicket.category !== undefined ? editTicket.category : ticket.category}
                      onChange={(e) => {
                        setEditTicket({
                          ...editTicket,
                          id: ticket.id,
                          category: e.target.value,
                        });
                      }}
                    >
                      <MenuItem value="Maintenance">Maintenance</MenuItem>
                      <MenuItem value="Cleaning">Cleaning</MenuItem>
                      <MenuItem value="Upgrade">Upgrade</MenuItem>
                      <MenuItem value="Repair">Repair</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  ) : (
                    ticket.category
                  )}
                </TableCell>
                <TableCell align="center">
                  {editTicket.id === ticket.id ? (
                    <Select
                      fullWidth
                      value={editTicket.status !== undefined ? editTicket.status : ticket.status}
                      onChange={(e) => {
                        setEditTicket({
                          ...editTicket,
                          id: ticket.id,
                          status: e.target.value,
                        });
                      }}
                    >
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                    </Select>
                  ) : (
                    ticket.status
                  )}
                </TableCell>
                <TableCell align="center">
                  {editTicket.id === ticket.id ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleEdit(ticket.id)}
                      sx={{ mr: 1 }}
                    >
                      Save
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setEditTicket({
                          id: ticket.id,
                          title: ticket.title,
                          description: ticket.description,
                          priority: ticket.priority,
                          category: ticket.category,
                          status: ticket.status,
                        })
                      }
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleDelete(ticket.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ViewTickets;