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
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useAuth } from '../context/AuthContext';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

const ViewTickets = () => {
  const { auth } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    category: 'General'
  });

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const categories = ['General', 'Maintenance', 'Security', 'Cleaning', 'Other'];

  useEffect(() => {
    fetchTickets();
  }, [auth]);

  const fetchTickets = async () => {
    try {
      let endpoint = '/tickets';
      if (auth.role === 'manager') {
        endpoint = `/properties/${auth.managedPropertyId}/tickets`;
      } else if (auth.role === 'user') {
        endpoint = `/properties/${auth.assignedPropertyId}/tickets`;
      }
      
      const response = await apiClient.get(endpoint);
      setTickets(response.data.tickets);
    } catch (error) {
      setError('Failed to fetch tickets');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrEdit = async () => {
    try {
      if (editingTicket) {
        await apiClient.patch(`/tickets/${editingTicket.ticket_id}`, ticketForm);
        setMessage('Ticket updated successfully');
      } else {
        await apiClient.post('/tickets', ticketForm);
        setMessage('Ticket created successfully');
      }
      fetchTickets();
      handleCloseDialog();
    } catch (error) {
      setError('Failed to save ticket');
      console.error(error);
    }
  };

  const handleOpenDialog = (ticket = null) => {
    if (ticket) {
      setEditingTicket(ticket);
      setTicketForm({
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        category: ticket.category
      });
    } else {
      setEditingTicket(null);
      setTicketForm({
        title: '',
        description: '',
        priority: 'Low',
        category: 'General'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTicket(null);
    setTicketForm({
      title: '',
      description: '',
      priority: 'Low',
      category: 'General'
    });
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await apiClient.patch(`/tickets/${ticketId}`, { status: newStatus });
      setTickets(tickets.map(ticket => 
        ticket.ticket_id === ticketId ? { ...ticket, status: newStatus } : ticket
      ));
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Tickets</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Ticket
        </Button>
      </Box>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.ticket_id}>
                <TableCell>{ticket.ticket_id}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell>{ticket.description}</TableCell>
                <TableCell>
                  <Chip 
                    label={ticket.status}
                    color={
                      ticket.status === 'Open' ? 'error' :
                      ticket.status === 'In Progress' ? 'warning' :
                      'success'
                    }
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={ticket.priority}
                    color={
                      ticket.priority === 'Critical' ? 'error' :
                      ticket.priority === 'High' ? 'warning' :
                      ticket.priority === 'Medium' ? 'info' :
                      'success'
                    }
                  />
                </TableCell>
                <TableCell>{ticket.category}</TableCell>
                <TableCell>{ticket.created_by_username}</TableCell>
                <TableCell>{ticket.assigned_to_username}</TableCell>
                <TableCell>
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog(ticket)}
                    size="small"
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTicket ? 'Edit Ticket' : 'Create New Ticket'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Title"
              value={ticketForm.title}
              onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={ticketForm.description}
              onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              multiline
              rows={4}
              fullWidth
              required
            />
            <Select
              value={ticketForm.priority}
              onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
              fullWidth
              label="Priority"
            >
              {priorities.map((priority) => (
                <MenuItem key={priority} value={priority}>{priority}</MenuItem>
              ))}
            </Select>
            <Select
              value={ticketForm.category}
              onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
              fullWidth
              label="Category"
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleCreateOrEdit} variant="contained" color="primary">
            {editingTicket ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewTickets;