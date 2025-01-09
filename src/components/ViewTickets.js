import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Grid,
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
} from "@mui/material";

const ViewTickets = ({ token }) => {
  const [tickets, setTickets] = useState([]);
  const [editTicket, setEditTicket] = useState({});
  const [status, setStatus] = useState("");
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

    fetchTickets();
  }, [token]);

  const handleEdit = async (ticketId) => {
    try {
      const response = await axios.patch(
        `/tickets/${ticketId}`,
        { title: editTicket.title, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, title: editTicket.title, status }
            : ticket
        )
      );
      setEditTicket({});
    } catch (error) {
      console.error("Failed to edit ticket", error);
    }
  };

  const handleDelete = async (ticketId) => {
    try {
      const response = await axios.delete(`/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(response.data.message);
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
    } catch (error) {
      console.error("Failed to delete ticket", error);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        View Tickets
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Ticket ID</TableCell>
              <TableCell align="center">Title</TableCell>
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
                    <input
                      type="text"
                      defaultValue={ticket.title}
                      onChange={(e) =>
                        setEditTicket({
                          ...editTicket,
                          title: e.target.value,
                        })
                      }
                    />
                  ) : (
                    ticket.title
                  )}
                </TableCell>
                <TableCell align="center">
                  <Select
                    value={editTicket.id === ticket.id ? status : ticket.status}
                    onChange={(e) => setStatus(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                  </Select>
                </TableCell>
                <TableCell align="center">
                  {editTicket.id === ticket.id ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleEdit(ticket.id)}
                    >
                      Save
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => setEditTicket(ticket)}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="secondary"
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
      {message && <Typography color="success.main">{message}</Typography>}
    </Box>
  );
};

export default ViewTickets;
