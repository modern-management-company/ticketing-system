import React, { useState, useEffect } from 'react';
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
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import PropertySwitcher from './PropertySwitcher';

const Rooms = () => {
  const { auth } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    type: '',
    capacity: '',
    status: 'Available'
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchRooms();
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/properties');
      if (response.data && Array.isArray(response.data)) {
        setProperties(response.data);
        if (response.data.length > 0) {
          setSelectedProperty(response.data[0].property_id);
        }
      }
    } catch (err) {
      setError('Failed to fetch properties');
      console.error(err);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      if (response.data && Array.isArray(response.data.rooms)) {
        setRooms(response.data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  const handleAddRoom = async () => {
    try {
      setError(null);
      setSuccess(null);
      const response = await apiClient.post(`/properties/${selectedProperty}/rooms`, roomFormData);
      if (response.data && response.data.room) {
        setSuccess('Room added successfully');
        await fetchRooms();
        setOpenDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add room:', error);
      setError('Failed to add room');
    }
  };

  const resetForm = () => {
    setRoomFormData({
      name: '',
      type: '',
      capacity: '',
      status: 'Available'
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  if (loading && !selectedProperty) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Room Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <PropertySwitcher onPropertyChange={handlePropertyChange} />
          {selectedProperty && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleOpenDialog}
            >
              Add Room
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {selectedProperty ? (
        loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.room_id}>
                    <TableCell>{room.name}</TableCell>
                    <TableCell>{room.type}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>
                      <Chip 
                        label={room.status} 
                        color={room.status === 'Available' ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Alert severity="info">Please select a property to view rooms</Alert>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Room</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Room Name"
              value={roomFormData.name}
              onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Room Type"
              value={roomFormData.type}
              onChange={(e) => setRoomFormData({ ...roomFormData, type: e.target.value })}
              fullWidth
            />
            <TextField
              label="Capacity"
              type="number"
              value={roomFormData.capacity}
              onChange={(e) => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddRoom} variant="contained" color="primary">
            Add Room
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Rooms; 