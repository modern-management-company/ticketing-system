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
  InputLabel,
  IconButton
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PropertySwitcher from './PropertySwitcher';

const ViewTickets = () => {
  const { auth } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [properties, setProperties] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    category: 'General',
    property_id: '',
    room_id: ''
  });

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const categories = ['General', 'Maintenance', 'Security', 'Housekeeping', 'Other'];

  // Add this useEffect
  useEffect(() => {
    // If user has assigned properties, use the first one as default
    if (auth?.assigned_properties?.length > 0) {
      const defaultProperty = auth.assigned_properties[0].property_id;
      console.log('Setting default property:', defaultProperty);
      setSelectedProperty(defaultProperty);
    }
  }, [auth]);

  // Modify the existing useEffect
  useEffect(() => {
    if (selectedProperty) {
      console.log('Selected property changed, fetching data...');
      fetchTickets();
      fetchRooms();
    }
  }, [selectedProperty]);

  // Add properties fetching
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/properties');
      if (response.data) {
        // Filter only active properties
        const activeProperties = response.data.filter(prop => prop.status === 'active');
        setProperties(activeProperties);
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
      console.log('Current auth:', JSON.stringify(auth, null, 2));
      console.log('Current user role:', auth.identity?.role);
      console.log('Current user ID:', auth.identity?.user_id);
      
      // Get tickets and task assignments in parallel
      const [ticketsResponse, tasksResponse] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tickets`),
        apiClient.get(`/properties/${selectedProperty}/tasks`)
      ]);
      
      console.log('Tickets response:', JSON.stringify(ticketsResponse.data, null, 2));
      console.log('Tasks response:', JSON.stringify(tasksResponse.data, null, 2));
      
      if (ticketsResponse.data?.tickets) {
        let filteredTickets = ticketsResponse.data.tickets;
        
        // For regular users, only show tickets they created or are assigned to via tasks
        if (auth.identity?.role === 'user') {
          console.log('Filtering tickets for user role');
          console.log('Total tickets before filtering:', filteredTickets.length);
          
          // Get all tasks assigned to the user
          const userTasks = tasksResponse.data?.tasks?.filter(task => 
            task.assigned_to_id === auth.identity.user_id
          ) || [];
          
          // Get ticket IDs from task assignments
          const assignedTicketIds = userTasks
            .filter(task => task.ticket_id) // Only tasks linked to tickets
            .map(task => task.ticket_id);
          
          console.log('User assigned task ticket IDs:', assignedTicketIds);
          
          filteredTickets = filteredTickets.filter(ticket => {
            const isCreator = ticket.user_id === auth.identity.user_id;
            const isAssignedTask = assignedTicketIds.includes(ticket.ticket_id);
            
            console.log(`Ticket ${ticket.ticket_id}:`, {
              ticket_user_id: ticket.user_id,
              auth_user_id: auth.identity.user_id,
              isCreator,
              isAssignedTask,
              shouldShow: isCreator || isAssignedTask
            });
            
            return isCreator || isAssignedTask;
          });
          
          console.log('Filtered tickets:', filteredTickets.length);
        }
        
        setTickets(filteredTickets);
      } else {
        console.warn('No tickets data in response:', ticketsResponse.data);
        setTickets([]);
      }
      setError(null);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || error.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      if (!selectedProperty) return;
      console.log('Fetching rooms for property:', selectedProperty);
      
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      console.log('Rooms response:', response.data);
      
      if (response.data?.rooms) {
        setRooms(response.data.rooms);
      } else {
        console.warn('No rooms data in response:', response.data);
        setRooms([]);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const handlePropertyChange = (propertyId) => {
    console.log('Property changed to:', propertyId);
    setSelectedProperty(propertyId);
  };

  const handleCreateOrEdit = async () => {
    try {
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }

      // Validate required fields
      if (!ticketForm.title.trim()) {
        setError('Title is required');
        return;
      }
      if (!ticketForm.description.trim()) {
        setError('Description is required');
        return;
      }

      const ticketData = {
        ...ticketForm,
        property_id: selectedProperty
      };

      console.log('Creating/Editing ticket with data:', ticketData);

      if (editingTicket) {
        const response = await apiClient.patch(`/tickets/${editingTicket.ticket_id}`, ticketData);
        console.log('Ticket update response:', response.data);
        setMessage('Ticket updated successfully');
      } else {
        const response = await apiClient.post('/tickets', ticketData);
        console.log('Ticket creation response:', response.data);
        if (response.data?.notifications_sent) {
          setMessage('Ticket created successfully. Email notifications have been sent.');
        } else {
          setMessage('Ticket created successfully');
        }
      }
      await fetchTickets();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save ticket:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.msg || error.message || 'Failed to save ticket');
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
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }
      setEditingTicket(null);
      setTicketForm({
        title: '',
        description: '',
        priority: 'Low',
        category: 'General',
        property_id: selectedProperty,
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

  const handleDeleteTicket = async (ticketId) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      try {
        setError(null);
        setMessage(null);
        setLoading(true);
        
        const response = await apiClient.delete(`/tickets/${ticketId}`);
        
        if (response.status === 200) {
          setMessage('Ticket deleted successfully');
          setTickets(prevTickets => prevTickets.filter(ticket => ticket.ticket_id !== ticketId));
        }
      } catch (error) {
        console.error('Failed to delete ticket:', error);
        setError(error.response?.data?.msg || 'Failed to delete ticket');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tickets</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <PropertySwitcher onPropertyChange={handlePropertyChange} />
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
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenDialog(ticket)}
                        size="small"
                      >
                        Edit
                      </Button>
                      {(auth?.user?.role === 'super_admin' || 
                        auth?.user?.role === 'manager' || 
                        ticket.created_by_id === auth?.user?.user_id) && (
                        <Button
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteTicket(ticket.ticket_id)}
                          size="small"
                          color="error"
                        >
                          Delete
                        </Button>
                      )}
                    </Box>
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
            <Typography variant="subtitle1" color="textSecondary">
              Property: {properties.find(p => p.property_id === selectedProperty)?.name || 'No property selected'}
            </Typography>
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