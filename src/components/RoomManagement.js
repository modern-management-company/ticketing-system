import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

const RoomManagement = () => {
  const { auth } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [editRoom, setEditRoom] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    floor: ''
  });

  const [newRoom, setNewRoom] = useState({
    name: '',
    type: '',
    floor: '',
    status: 'Available',
    capacity: '',
    amenities: [],
    description: '',
    lastCleaned: new Date().toISOString().split('T')[0]
  });

  const roomTypes = ['Single', 'Double', 'Suite', 'Presidential Suite', 'Conference Room', 'Meeting Room'];
  const roomStatuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning', 'Out of Service'];
  const amenityOptions = [
    'Wi-Fi',
    'TV',
    'Mini Bar',
    'Safe',
    'Balcony',
    'Ocean View',
    'City View',
    'Kitchen',
    'Coffee Maker',
    'Air Conditioning'
  ];

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/properties');
      setProperties(response.data.properties);
      if (response.data.properties.length > 0) {
        setSelectedProperty(response.data.properties[0].property_id);
      }
    } catch (error) {
      setError('Failed to fetch properties');
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedProperty]);

  const fetchRooms = async () => {
    if (!selectedProperty) return;
    try {
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      setRooms(response.data.rooms);
    } catch (error) {
      setError('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!selectedProperty) {
      setError('Please select a property');
      return;
    }

    try {
      await apiClient.post(`/properties/${selectedProperty}/rooms`, newRoom);
      setMessage('Room added successfully');
      setNewRoom({
        name: '',
        type: '',
        floor: '',
        status: 'Available',
        capacity: '',
        amenities: [],
        description: '',
        lastCleaned: new Date().toISOString().split('T')[0]
      });
      fetchRooms();
    } catch (error) {
      setError('Failed to add room');
    }
  };

  const handleEditClick = (room) => {
    setEditRoom({
      ...room,
      amenities: room.amenities || [],
      lastCleaned: room.last_cleaned ? new Date(room.last_cleaned).toISOString().split('T')[0] : ''
    });
  };

  const handleUpdateRoom = async (roomId) => {
    try {
      const payload = {
        ...editRoom,
        last_cleaned: editRoom.lastCleaned,
        property_id: selectedProperty
      };
      
      await apiClient.put(`/properties/${selectedProperty}/rooms/${roomId}`, payload);
      setMessage('Room updated successfully');
      setEditRoom(null);
      fetchRooms();
    } catch (error) {
      console.error('Failed to update room:', error);
      setError('Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await apiClient.delete(`/properties/${selectedProperty}/rooms/${roomId}`);
      setMessage('Room deleted successfully');
      fetchRooms();
    } catch (error) {
      console.error('Failed to delete room:', error);
      setError('Failed to delete room');
    }
  };

  const filteredRooms = rooms.filter(room => {
    return (!filters.type || room.type === filters.type) &&
           (!filters.status || room.status === filters.status) &&
           (!filters.floor || room.floor === filters.floor);
  });

  if (loading) return <CircularProgress />;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Room Management</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      {/* Property Selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Property</InputLabel>
        <Select
          value={selectedProperty || ''}
          onChange={(e) => setSelectedProperty(e.target.value)}
        >
          {properties.map(property => (
            <MenuItem key={property.property_id} value={property.property_id}>
              {property.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Add New Room Form */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Add New Room</Typography>
        <form onSubmit={handleAddRoom}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Room Name/Number"
                value={newRoom.name}
                onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required>
                <InputLabel>Room Type</InputLabel>
                <Select
                  value={newRoom.type}
                  onChange={(e) => setNewRoom({...newRoom, type: e.target.value})}
                >
                  {roomTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Floor"
                type="number"
                value={newRoom.floor}
                onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Capacity"
                type="number"
                value={newRoom.capacity}
                onChange={(e) => setNewRoom({...newRoom, capacity: e.target.value})}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newRoom.status}
                  onChange={(e) => setNewRoom({...newRoom, status: e.target.value})}
                >
                  {roomStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Last Cleaned"
                type="date"
                value={newRoom.lastCleaned}
                onChange={(e) => setNewRoom({...newRoom, lastCleaned: e.target.value})}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <Typography variant="subtitle2" gutterBottom>Amenities</Typography>
                <Grid container spacing={1}>
                  {amenityOptions.map((amenity) => (
                    <Grid item key={amenity}>
                      <Chip
                        label={amenity}
                        onClick={() => {
                          const newAmenities = newRoom.amenities.includes(amenity)
                            ? newRoom.amenities.filter(a => a !== amenity)
                            : [...newRoom.amenities, amenity];
                          setNewRoom({...newRoom, amenities: newAmenities});
                        }}
                        color={newRoom.amenities.includes(amenity) ? "primary" : "default"}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description/Notes"
                multiline
                rows={3}
                value={newRoom.description}
                onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
              >
                Add Room
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Room List</Typography>
          <Button
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </Box>
        
        {showFilters && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Filter by Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {roomTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {roomStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Filter by Floor"
                type="number"
                value={filters.floor}
                onChange={(e) => setFilters({...filters, floor: e.target.value})}
                fullWidth
              />
            </Grid>
          </Grid>
        )}

        {/* Rooms Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name/Number</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Floor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Amenities</TableCell>
                <TableCell>Last Cleaned</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRooms.map((room) => (
                <TableRow key={room.room_id}>
                  <TableCell>{room.name}</TableCell>
                  <TableCell>{room.type}</TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell>
                    <Chip
                      label={room.status}
                      color={
                        room.status === 'Available' ? 'success' :
                        room.status === 'Occupied' ? 'primary' :
                        room.status === 'Maintenance' ? 'warning' :
                        room.status === 'Cleaning' ? 'info' : 'error'
                      }
                    />
                  </TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {room.amenities?.map((amenity) => (
                        <Chip key={amenity} label={amenity} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {room.last_cleaned ? new Date(room.last_cleaned).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Tooltip title="Edit">
                        <IconButton 
                          onClick={() => handleEditClick(room)} 
                          color="primary"
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          onClick={() => handleDeleteRoom(room.room_id)} 
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Room Dialog */}
      <Dialog open={Boolean(editRoom)} onClose={() => setEditRoom(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Room</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Room Name/Number"
              value={editRoom?.name || ''}
              onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Room Type</InputLabel>
              <Select
                value={editRoom?.type || ''}
                onChange={(e) => setEditRoom({ ...editRoom, type: e.target.value })}
              >
                {roomTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Floor"
              type="number"
              value={editRoom?.floor || ''}
              onChange={(e) => setEditRoom({ ...editRoom, floor: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editRoom?.status || ''}
                onChange={(e) => setEditRoom({ ...editRoom, status: e.target.value })}
              >
                {roomStatuses.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Capacity"
              type="number"
              value={editRoom?.capacity || ''}
              onChange={(e) => setEditRoom({ ...editRoom, capacity: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>Amenities</Typography>
              <Grid container spacing={1}>
                {amenityOptions.map((amenity) => (
                  <Grid item key={amenity}>
                    <Chip
                      label={amenity}
                      onClick={() => {
                        const newAmenities = editRoom.amenities.includes(amenity)
                          ? editRoom.amenities.filter(a => a !== amenity)
                          : [...editRoom.amenities, amenity];
                        setEditRoom({ ...editRoom, amenities: newAmenities });
                      }}
                      color={editRoom?.amenities?.includes(amenity) ? "primary" : "default"}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormControl>
            <TextField
              label="Last Cleaned"
              type="date"
              value={editRoom?.lastCleaned || ''}
              onChange={(e) => setEditRoom({ ...editRoom, lastCleaned: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRoom(null)}>Cancel</Button>
          <Button onClick={() => handleUpdateRoom(editRoom.room_id)} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoomManagement; 