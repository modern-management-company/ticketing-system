import React, { useEffect, useState } from "react";
import { useAuth } from '../context/AuthContext';
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
  FormControl,
  InputLabel
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

const ViewTickets = () => {
  const { auth } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    category: 'General',
    property_id: '',
    room_id: ''
  });

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const categories = ['General', 'Maintenance', 'Security', 'Cleaning', 'Other'];

  // Fetch properties on component mount
  useEffect(() => {
    fetchProperties();
  }, []);

  // Fetch tickets and rooms when property is selected
  useEffect(() => {
    if (selectedProperty) {
      fetchTickets();
      fetchRooms();
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/properties');
      if (response.data) {
        setProperties(response.data);
        // Set first property as default if available
        if (response.data.length > 0) {
          setSelectedProperty(response.data[0].property_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setError('Failed to load properties');
    }
  };

  const fetchTickets = async () => {
    try {
      if (!auth?.token || !selectedProperty) {
        return;
      }
      setLoading(true);
      const response = await apiClient.get(`/properties/${selectedProperty}/tickets`);
      if (response.data?.tickets) {
        setTickets(response.data.tickets);
      } else {
        setTickets([]);
      }
      setError(null);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setError(error.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      if (!selectedProperty) return;
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      if (response.data?.rooms) {
        setRooms(response.data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleCreateOrEdit = async () => {
    try {
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }

      const ticketData = {
        ...ticketForm,
        property_id: selectedProperty
      };

      if (editingTicket) {
        await apiClient.patch(`/tickets/${editingTicket.ticket_id}`, ticketData);
        setMessage('Ticket updated successfully');
      } else {
        await apiClient.post('/tickets', ticketData);
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
        category: ticket.category,
        property_id: ticket.property_id,
        room_id: ticket.room_id || ''
      });
    } else {
      setEditingTicket(null);
      setTicketForm({
        title: '',
        description: '',
        priority: 'Low',
        category: 'General',
        property_id: selectedProperty || '',
        room_id: ''
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
      category: 'General',
      property_id: selectedProperty || '',
      room_id: ''
    });
  };

  const handlePropertyChange = (event) => {
    setSelectedProperty(event.target.value);
  };

  if (loading && !properties.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tickets</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Select Property</InputLabel>
            <Select
              value={selectedProperty || ''}
              onChange={handlePropertyChange}
              label="Select Property"
            >
              {properties.map((property) => (
                <MenuItem key={property.property_id} value={property.property_id}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={!selectedProperty}
          >
            Create Ticket
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {!selectedProperty ? (
        <Alert severity="info">Please select a property to view tickets</Alert>
      ) : loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Created By</TableCell>
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
                    {rooms.find(r => r.room_id === ticket.room_id)?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={ticket.status}
                      color={
                        ticket.status.toLowerCase() === 'open' ? 'error' :
                        ticket.status.toLowerCase() === 'in progress' ? 'warning' :
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
      )}

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
            <FormControl fullWidth>
              <InputLabel>Room</InputLabel>
              <Select
                value={ticketForm.room_id}
                onChange={(e) => setTicketForm({ ...ticketForm, room_id: e.target.value })}
                label="Room"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {rooms.map((room) => (
                  <MenuItem key={room.room_id} value={room.room_id}>
                    {room.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                label="Priority"
              >
                {priorities.map((priority) => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={ticketForm.category}
                onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
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