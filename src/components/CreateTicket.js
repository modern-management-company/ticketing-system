import React, { useState, useEffect, useCallback } from "react";
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
import { useNavigate } from "react-router-dom";

const CreateTicket = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Low',
    category: 'General',
    room_id: ''
  });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const categories = ['Maintenance', 'Cleaning', 'Security', 'IT Support', 'Other'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  const fetchRooms = useCallback(async () => {
    if (!auth?.token) {
      setError('Authentication required');
      return;
    }

    try {
      const propertyId = auth.user.managedPropertyId || auth.user.assignedPropertyId;
      if (!propertyId) {
        setError('No property assigned');
        return;
      }

      const response = await apiClient.get(`/properties/${propertyId}/rooms`);
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setError('Failed to load rooms');
    }
  }, [auth?.token, auth?.user?.managedPropertyId, auth?.user?.assignedPropertyId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth?.token) {
      setError('Authentication required');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/tickets', formData);
      setSuccess(true);
      navigate('/tickets');
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setError(error.response?.data?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Create New Ticket
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }}>Ticket created successfully!</Alert>}
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

