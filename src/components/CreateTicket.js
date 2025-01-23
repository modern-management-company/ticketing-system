import React, { useState, useEffect } from "react";
import apiClient from "./apiClient"; 
import {
  Box,
  Button,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Grid,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const CreateTicket = () => {
  const { auth } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: '',
    category: '',
    room_id: ''
  });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const categories = ['Maintenance', 'Cleaning', 'Security', 'IT Support', 'Other'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const propertyId = auth.role === 'manager' ? 
          auth.managedPropertyId : auth.assignedPropertyId;
        
        const response = await apiClient.get(`/properties/${propertyId}/rooms`);
        setRooms(response.data.rooms);
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
        setError('Failed to load rooms');
      }
    };

    if (auth.managedPropertyId || auth.assignedPropertyId) {
      fetchRooms();
    }
  }, [auth]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const propertyId = auth.role === 'manager' ? 
        auth.managedPropertyId : auth.assignedPropertyId;

      const response = await apiClient.post('/tickets', {
        ...formData,
        property_id: propertyId
      });

      setMessage('Ticket created successfully!');
      setFormData({
        title: '',
        description: '',
        priority: '',
        category: '',
        room_id: ''
      });
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setError('Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Create New Ticket
      </Typography>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              name="title"
              label="Title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="description"
              label="Description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={4}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Priority</InputLabel>
              <Select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                {priorities.map(priority => (
                  <MenuItem key={priority} value={priority}>
                    {priority}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Room</InputLabel>
              <Select
                name="room_id"
                value={formData.room_id}
                onChange={handleChange}
              >
                {rooms.map(room => (
                  <MenuItem key={room.room_id} value={room.room_id}>
                    {room.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Ticket'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default CreateTicket;

