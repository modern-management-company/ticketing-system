import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from "./apiClient";
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Grid,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PropertySwitcher from './PropertySwitcher';

const ServiceRequests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [rooms, setRooms] = useState([]);

  const [requestForm, setRequestForm] = useState({
    room_id: '',
    property_id: '',
    request_group: '',
    request_type: '',
    priority: 'normal',
    quantity: 1,
    guest_name: '',
    notes: ''
  });

  const requestGroups = {
    'Housekeeping': [
      'Towels',
      'Bath Amenities',
      'Extra Pillows',
      'Extra Blanket',
      'Toiletries',
      'Room Cleaning',
      'Other'
    ],
    'Front Desk': [
      'Check-in Assistance',
      'Check-out Assistance',
      'Key Card Issue',
      'Luggage Assistance',
      'Guest Information',
      'Other'
    ],
    'Engineering': [
      'AC/Heating Issue',
      'Plumbing Issue',
      'Electrical Issue',
      'TV/Internet Issue',
      'Furniture Repair',
      'Other'
    ]
  };

  const priorityLevels = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  useEffect(() => {
    if (selectedProperty) {
      fetchRequests();
      fetchRooms();
    }
  }, [selectedProperty]);

  useEffect(() => {
    // Check if we have state from navigation
    if (location.state?.createRequest) {
      const { roomId, roomName, propertyId } = location.state;
      
      // Set the selected property
      if (propertyId) {
        setSelectedProperty(propertyId);
      }
      
      // Open the dialog and pre-fill the room
      setRequestForm(prev => ({
        ...prev,
        room_id: roomId,
        property_id: propertyId
      }));
      
      // Clear the navigation state to prevent reopening on refresh
      setTimeout(() => {
        setOpenDialog(true);
        navigate(location.pathname, { replace: true });
      }, 100);
    }
  }, [location.state, navigate]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/service-requests?property_id=${selectedProperty}`);
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      setError('Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      setRooms(response.data.rooms);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
    setRequestForm(prev => ({ ...prev, property_id: propertyId }));
  };

  const handleCreateRequest = async () => {
    try {
      setError(null);
      setSuccess(null);

      // Validate required fields
      if (!requestForm.room_id || !requestForm.request_group || !requestForm.request_type || !requestForm.priority) {
        setError('Please fill in all required fields');
        return;
      }

      const response = await apiClient.post('/service-requests', requestForm);
      setSuccess('Service request created successfully');
      await fetchRequests();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create request:', error);
      setError(error.response?.data?.message || 'Failed to create request');
    }
  };

  const handleCompleteRequest = async (requestId) => {
    try {
      setError(null);
      setSuccess(null);

      await apiClient.patch(`/service-requests/${requestId}`, {
        status: 'completed'
      });

      setSuccess('Request marked as completed');
      await fetchRequests();
    } catch (error) {
      console.error('Failed to update request:', error);
      setError(error.response?.data?.message || 'Failed to update request');
    }
  };

  const resetForm = () => {
    setRequestForm({
      room_id: '',
      property_id: selectedProperty || '',
      request_group: '',
      request_type: '',
      priority: 'normal',
      quantity: 1,
      guest_name: '',
      notes: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Service Requests</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <PropertySwitcher onPropertyChange={handlePropertyChange} />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            disabled={!selectedProperty}
          >
            New Request
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {!selectedProperty ? (
        <Alert severity="info">Please select a property to view requests</Alert>
      ) : loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {requests.map((request) => (
            <Grid item xs={12} sm={6} md={4} key={request.request_id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{request.request_type}</Typography>
                    <Box>
                      <Chip
                        label={request.status}
                        color={getStatusColor(request.status)}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={request.priority}
                        color={getPriorityColor(request.priority)}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <Typography color="textSecondary" gutterBottom>
                    Room: {request.room_number}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Group: {request.request_group}
                  </Typography>
                  {request.quantity > 1 && (
                    <Typography variant="body2" paragraph>
                      Quantity: {request.quantity}
                    </Typography>
                  )}
                  {request.guest_name && (
                    <Typography variant="body2" gutterBottom>
                      Guest: {request.guest_name}
                    </Typography>
                  )}
                  {request.notes && (
                    <Typography variant="body2" color="textSecondary">
                      Notes: {request.notes}
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Created: {new Date(request.created_at).toLocaleString()}
                  </Typography>
                </CardContent>
                {request.status !== 'completed' && (
                  auth?.user?.role === 'super_admin' || 
                  (auth?.user?.role === 'manager' && auth?.user?.group === request.request_group) ||
                  (auth?.user?.group === request.request_group)
                ) && (
                  <CardActions>
                    <Button
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleCompleteRequest(request.request_id)}
                      color="success"
                      variant="contained"
                      size="small"
                    >
                      Mark Complete
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {location.state?.createRequest 
            ? `New Service Request for ${location.state.roomName || 'Room'}`
            : 'New Service Request'
          }
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Room</InputLabel>
              <Select
                value={requestForm.room_id}
                onChange={(e) => setRequestForm({ ...requestForm, room_id: e.target.value, property_id: selectedProperty })}
                label="Room"
                required
              >
                {rooms.map((room) => (
                  <MenuItem key={room.room_id} value={room.room_id}>
                    {room.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Request Group</InputLabel>
              <Select
                value={requestForm.request_group}
                onChange={(e) => setRequestForm({ 
                  ...requestForm, 
                  request_group: e.target.value,
                  request_type: ''  // Reset request type when group changes
                })}
                label="Request Group"
                required
              >
                {Object.keys(requestGroups).map((group) => (
                  <MenuItem key={group} value={group}>
                    {group}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!requestForm.request_group}>
              <InputLabel>Request Type</InputLabel>
              <Select
                value={requestForm.request_type}
                onChange={(e) => setRequestForm({ ...requestForm, request_type: e.target.value })}
                label="Request Type"
                required
              >
                {requestForm.request_group && requestGroups[requestForm.request_group].map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={requestForm.priority}
                onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                label="Priority"
                required
              >
                {priorityLevels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantity"
              type="number"
              value={requestForm.quantity}
              onChange={(e) => setRequestForm({ ...requestForm, quantity: parseInt(e.target.value) || 1 })}
              InputProps={{ inputProps: { min: 1 } }}
            />

            <TextField
              label="Guest Name"
              value={requestForm.guest_name}
              onChange={(e) => setRequestForm({ ...requestForm, guest_name: e.target.value })}
            />

            <TextField
              label="Notes"
              value={requestForm.notes}
              onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateRequest} variant="contained" color="primary">
            Create Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceRequests; 