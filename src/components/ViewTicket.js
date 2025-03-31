import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from "./apiClient";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestoreIcon from '@mui/icons-material/Restore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';

const ViewTicket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    category: 'General',
    subcategory: '',
    room_id: ''
  });

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const categories = ['General', 'Maintenance', 'Security', 'Housekeeping', 'Other'];
  
  const subcategories = {
    'Maintenance': ['Plumbing', 'Electrical', 'HVAC', 'Structural', 'Appliances', 'Other'],
    'Cleaning': ['Room Cleaning', 'Common Area', 'Deep Cleaning', 'Laundry', 'Other'],
    'Security': ['Access Control', 'Surveillance', 'Incident Report', 'Safety Concern', 'Other'],
    'IT Support': ['Network', 'Hardware', 'Software', 'Account Access', 'Other'],
    'General': ['General Inquiry', 'Feedback', 'Request', 'Complaint', 'Other'],
    'Housekeeping': ['Room Cleaning', 'Common Area', 'Deep Cleaning', 'Laundry', 'Other'],
    'Other': ['General Inquiry', 'Feedback', 'Request', 'Complaint', 'Other']
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    if (ticket?.property_id) {
      fetchRooms();
    }
  }, [ticket?.property_id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/tickets/${ticketId}`);
      setTicket(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      setError(error.response?.data?.msg || 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await apiClient.get(`/properties/${ticket.property_id}/rooms`);
      if (response.data?.rooms) {
        setRooms(response.data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await apiClient.patch(`/tickets/${ticketId}`, { status: newStatus });
      setMessage('Ticket status updated successfully');
      fetchTicket(); // Refresh ticket data
    } catch (error) {
      setError('Failed to update ticket status');
    }
  };

  const handleDeleteTicket = async () => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      try {
        await apiClient.delete(`/tickets/${ticketId}`);
        setMessage('Ticket deleted successfully');
        navigate('/tickets');
      } catch (error) {
        setError('Failed to delete ticket');
      }
    }
  };

  const handleOpenDialog = () => {
    setTicketForm({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      subcategory: ticket.subcategory || '',
      room_id: ticket.room_id || ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setTicketForm({
      title: '',
      description: '',
      priority: 'Low',
      category: 'General',
      subcategory: '',
      room_id: ''
    });
  };

  const handleUpdateTicket = async () => {
    try {
      if (isSubmitting) return;
      
      if (!ticketForm.title.trim()) {
        setError('Title is required');
        return;
      }
      if (!ticketForm.description.trim()) {
        setError('Description is required');
        return;
      }

      setIsSubmitting(true);
      await apiClient.patch(`/tickets/${ticketId}`, ticketForm);
      setMessage('Ticket updated successfully');
      handleCloseDialog();
      fetchTicket();
    } catch (error) {
      console.error('Failed to update ticket:', error);
      setError(error.response?.data?.msg || 'Failed to update ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortRooms = (rooms) => {
    return [...rooms].sort((a, b) => {
      const roomA = a.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const roomB = b.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      const numA = parseInt(roomA);
      const numB = parseInt(roomB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      return roomA.localeCompare(roomB);
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box p={3}>
        <Alert severity="error">Ticket not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Tooltip title="Back to Tickets">
          <IconButton onClick={() => navigate('/tickets')}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h5">Ticket #{ticket.ticket_id}</Typography>
      </Box>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" gutterBottom>{ticket.title}</Typography>
                <Typography variant="body1" paragraph>{ticket.description}</Typography>
              </Box>
              <Button
                startIcon={<EditIcon />}
                onClick={handleOpenDialog}
                variant="outlined"
              >
                Edit Ticket
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Status</Typography>
            <Chip 
              label={ticket.status}
              color={
                ticket.status.toLowerCase() === 'open' ? 'error' :
                ticket.status.toLowerCase() === 'in progress' ? 'warning' :
                'success'
              }
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Priority</Typography>
            <Chip 
              label={ticket.priority}
              color={
                ticket.priority === 'Critical' ? 'error' :
                ticket.priority === 'High' ? 'warning' :
                ticket.priority === 'Medium' ? 'info' :
                'success'
              }
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Category</Typography>
            <Typography variant="body2">{ticket.category}</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Subcategory</Typography>
            <Typography variant="body2">{ticket.subcategory || 'N/A'}</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Room</Typography>
            <Typography variant="body2">{ticket.room_name || 'N/A'}</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Created By</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{ticket.created_by_username}</Typography>
              <Chip 
                label={ticket.created_by_group || 'N/A'} 
                variant="outlined"
                size="small"
                color="primary"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {ticket.status.toLowerCase() !== 'completed' ? (
                <Button
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleStatusChange('completed')}
                  color="success"
                  variant="outlined"
                >
                  Mark Complete
                </Button>
              ) : (
                <Button
                  startIcon={<RestoreIcon />}
                  onClick={() => handleStatusChange('open')}
                  color="primary"
                  variant="outlined"
                >
                  Reopen Ticket
                </Button>
              )}

              {(auth?.user?.role === 'super_admin' || 
                ticket.created_by_id === auth?.user?.user_id) && (
                <Button
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteTicket}
                  color="error"
                  variant="outlined"
                >
                  Delete Ticket
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Ticket
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
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
            <Autocomplete
              options={sortRooms(rooms)}
              getOptionLabel={(option) => option.name || ''}
              value={rooms.find(room => room.room_id === ticketForm.room_id) || null}
              onChange={(event, newValue) => {
                setTicketForm({
                  ...ticketForm,
                  room_id: newValue?.room_id || ''
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Room"
                  required
                  error={!ticketForm.room_id}
                />
              )}
              isOptionEqualToValue={(option, value) => option.room_id === value.room_id}
              freeSolo={false}
              autoSelect
              autoComplete
              clearOnBlur={false}
              filterOptions={(options, { inputValue }) => {
                const filtered = options.filter(option =>
                  option.name.toLowerCase().includes(inputValue.toLowerCase())
                );
                return filtered;
              }}
            />
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
                onChange={(e) => setTicketForm({ 
                  ...ticketForm, 
                  category: e.target.value,
                  subcategory: '' // Reset subcategory when category changes
                })}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Subcategory</InputLabel>
              <Select
                value={ticketForm.subcategory}
                onChange={(e) => setTicketForm({ ...ticketForm, subcategory: e.target.value })}
                label="Subcategory"
                disabled={!ticketForm.category}
              >
                {subcategories[ticketForm.category]?.map((subcategory) => (
                  <MenuItem key={subcategory} value={subcategory}>{subcategory}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancel</Button>
          <Button 
            onClick={handleUpdateTicket} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewTicket; 