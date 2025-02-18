import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PropertySwitcher from './PropertySwitcher';

const ViewRooms = () => {
  const { auth } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    type: '',
    floor: '',
    status: 'Available'
  });

  const roomTypes = ['Single', 'Double', 'Suite', 'Conference', 'Other'];
  const roomStatuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning'];

  useEffect(() => {
    console.log('Auth context:', auth);
  }, [auth]);

  const isManager = auth?.user?.role === 'manager' || auth?.user?.role === 'super_admin';

  useEffect(() => {
    if (selectedProperty) {
      fetchRooms();
    }
  }, [selectedProperty]);

  const fetchRooms = async () => {
    if (!selectedProperty) return;

    try {
      setLoading(true);
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      if (response.data && Array.isArray(response.data.rooms)) {
        const processedRooms = response.data.rooms.map(room => ({
          ...room,
          type: room.type || roomTypes[0]
        }));
        setRooms(processedRooms);
      } else {
        setRooms([]);
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

      if (!roomFormData.name) {
        setError('Room name is required');
        return;
      }

      const response = await apiClient.post(`/properties/${selectedProperty}/rooms`, roomFormData);
      if (response.data) {
        setSuccess('Room added successfully');
        await fetchRooms();
        setOpenDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add room:', error);
      setError(error.response?.data?.message || 'Failed to add room');
    }
  };

  const handleEditRoom = async (roomId) => {
    try {
      await apiClient.put(`/properties/${selectedProperty}/rooms/${roomId}`, roomFormData);
      setSuccess('Room updated successfully');
      await fetchRooms();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        setError(null);
        setSuccess(null);
        setLoading(true);

        const response = await apiClient.delete(`/properties/${selectedProperty}/rooms/${roomId}`);

        if (response.status === 200) {
          setSuccess('Room deleted successfully');
          setRooms(prevRooms => prevRooms.filter(room => room.room_id !== roomId));
        }
      } catch (error) {
        console.error('Failed to delete room:', error);
        setError(error.response?.data?.msg || 'Failed to delete room');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setRoomFormData({
      name: '',
      type: '',
      floor: '',
      status: 'Available'
    });
  };

  const getUniqueFloors = () => {
    const floors = rooms.map(room => room.floor).filter(floor => floor !== null && floor !== undefined);
    return [...new Set(floors)].sort((a, b) => a - b);
  };

  const filteredRooms = rooms.filter(room =>
    selectedFloor === 'all' || room.floor === selectedFloor
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Room Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <PropertySwitcher onPropertyChange={handlePropertyChange} />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Floor</InputLabel>
            <Select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              label="Floor"
            >
              <MenuItem value="all">All Floors</MenuItem>
              {getUniqueFloors().map(floor => (
                <MenuItem key={floor} value={floor}>Floor {floor}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedProperty && isManager && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
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
          <Grid container spacing={3}>
            {filteredRooms.map((room) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={room.room_id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      display: 'flex',
                      gap: 1
                    }}>
                      <Chip
                        label={room.status}
                        size="small"
                        color={
                          room.status === 'Available' ? 'success' :
                            room.status === 'Occupied' ? 'error' :
                              room.status === 'Maintenance' ? 'warning' :
                                'default'
                        }
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
                      <MeetingRoomIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" component="div">
                        {room.name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography color="textSecondary">
                        Type: {room.type || 'N/A'}
                      </Typography>
                      <Typography color="textSecondary">
                        Floor: {room.floor || 'N/A'}
                      </Typography>
                    </Box>
                  </CardContent>
                  {isManager && (
                    <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                      <IconButton
                        onClick={() => {
                          const roomToEdit = {
                            ...room,
                            type: room.type || roomTypes[0]
                          };
                          setRoomFormData(roomToEdit);
                          setOpenDialog(true);
                        }}
                        color="primary"
                        size="small"
                        title="Edit Room"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteRoom(room.room_id)}
                        color="error"
                        size="small"
                        title="Delete Room"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      ) : (
        <Alert severity="info">Please select a property to view rooms</Alert>
      )}

      <Dialog open={openDialog} onClose={() => {
        setOpenDialog(false);
        resetForm();
      }}>
        <DialogTitle>
          {roomFormData.room_id ? 'Edit Room' : 'Add New Room'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Room Name"
              value={roomFormData.name}
              onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Room Type</InputLabel>
              <Select
                value={roomFormData.type}
                onChange={(e) => setRoomFormData({ ...roomFormData, type: e.target.value })}
                label="Room Type"
              >
                {roomTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Floor"
              value={roomFormData.floor}
              onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
              fullWidth
              type="number"
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={roomFormData.status}
                onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                label="Status"
              >
                {roomStatuses.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button
            onClick={() => roomFormData.room_id ? handleEditRoom(roomFormData.room_id) : handleAddRoom()}
            variant="contained"
            color="primary"
          >
            {roomFormData.room_id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewRooms;
