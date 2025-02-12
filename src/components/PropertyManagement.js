import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import PropertySwitcher from './PropertySwitcher';

const PropertyManagement = () => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [openPropertyDialog, setOpenPropertyDialog] = useState(false);
  const [openRoomDialog, setOpenRoomDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [propertyFormData, setPropertyFormData] = useState({
    name: '',
    address: '',
    type: '',
    status: 'active',
    description: ''
  });
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    type: '',
    floor: '',
    status: 'Available'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
    if (auth.role === 'super_admin' || auth.role === 'manager') {
      fetchUsers();
    }
  }, [auth.role]);

  useEffect(() => {
    if (selectedProperty) {
      fetchRooms(selectedProperty);
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/properties');
      if (response.data && Array.isArray(response.data.properties)) {
        setProperties(response.data.properties);
        if (response.data.properties?.length > 0) {
          setSelectedProperty(response.data.properties[0].property_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (propertyId) => {
    try {
      const response = await apiClient.get(`/properties/${propertyId}/rooms`);
      setRooms(response.data.rooms || []);
    } catch (error) {
      setError('Failed to fetch rooms');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      if (response.data && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      } else if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        setUsers([]);
        console.warn('No users data available or invalid format');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to fetch users');
      setUsers([]);
    }
  };

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      const payload = {
        name: propertyFormData.name,
        address: propertyFormData.address,
        type: propertyFormData.type,
        status: propertyFormData.status,
        description: propertyFormData.description
      };

      if (propertyFormData.property_id) {
        await apiClient.put(`/properties/${propertyFormData.property_id}`, payload);
        setSuccess('Property updated successfully');
      } else {
        await apiClient.post('/properties', payload);
        setSuccess('Property created successfully');
      }
      
      await fetchProperties();
      setOpenPropertyDialog(false);
      resetPropertyForm();
    } catch (error) {
      console.error('Failed to save property:', error);
      setError(error.response?.data?.message || 'Failed to save property');
    }
  };

  const handlePropertyEdit = (property) => {
    setPropertyFormData({
      property_id: property.property_id,
      name: property.name,
      address: property.address,
      type: property.type,
      status: property.status,
      description: property.description
    });
    setOpenPropertyDialog(true);
  };

  const handlePropertyDelete = async (propertyId) => {
    try {
      setError('');
      setSuccess('');
      
      await apiClient.delete(`/properties/${propertyId}`);
      setSuccess('Property deleted successfully');
      await fetchProperties();
    } catch (error) {
      console.error('Failed to delete property:', error);
      setError(error.response?.data?.message || 'Failed to delete property');
    }
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }
      if (roomFormData.room_id) {
        await apiClient.put(`/properties/${selectedProperty}/rooms/${roomFormData.room_id}`, roomFormData);
        setSuccess('Room updated successfully');
      } else {
        await apiClient.post(`/properties/${selectedProperty}/rooms`, roomFormData);
        setSuccess('Room created successfully');
      }
      fetchRooms(selectedProperty);
      setOpenRoomDialog(false);
      resetRoomForm();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        await apiClient.delete(`/properties/${selectedProperty}/rooms/${roomId}`);
        setSuccess('Room deleted successfully');
        fetchRooms(selectedProperty);
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to delete room');
      }
    }
  };

  const resetPropertyForm = () => {
    setPropertyFormData({
      name: '',
      address: '',
      type: '',
      status: 'active',
      description: ''
    });
  };

  const resetRoomForm = () => {
    setRoomFormData({
      name: '',
      type: '',
      floor: '',
      status: 'Available'
    });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleUserPropertyAssignment = async (userId, propertyIds) => {
    try {
      await apiClient.post('/assign-property', {
        user_id: userId,
        property_ids: propertyIds
      });
      setSuccess('User property assignments updated successfully');
      fetchUsers(); // Refresh the users list to get updated assignments
    } catch (error) {
      console.error('Failed to update user property assignments:', error);
      setError(error.response?.data?.message || 'Failed to update user property assignments');
    }
  };

  const handlePropertyChange = (propertyId) => {
    const property = properties.find(p => p.property_id === propertyId);
    setSelectedProperty(property);
  };

  const handleAddProperty = async () => {
    try {
      setError(null);
      setSuccess(null);
      const response = await apiClient.post('/properties', propertyFormData);
      if (response.data && response.data.property) {
        setSuccess('Property added successfully');
        await fetchProperties();
        setOpenPropertyDialog(false);
        resetPropertyForm();
      }
    } catch (error) {
      console.error('Failed to add property:', error);
      setError('Failed to add property');
    }
  };

  const handleOpenDialog = () => {
    resetPropertyForm();
    setOpenPropertyDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenPropertyDialog(false);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Properties" />
          <Tab label="Rooms" />
          {(auth.role === 'super_admin' || auth.role === 'manager') && (
            <Tab label="Users" />
          )}
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Properties Tab */}
      {activeTab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">Manage Properties</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <PropertySwitcher onPropertyChange={handlePropertyChange} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
              >
                Add Property
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {properties.map((property) => (
              <Grid item xs={12} sm={6} md={4} key={property.property_id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{property.name}</Typography>
                    <Typography color="textSecondary">{property.address}</Typography>
                    <Typography>Type: {property.type || 'N/A'}</Typography>
                    <Typography>Status: {property.status}</Typography>
                    {(auth.role === 'super_admin' || auth.role === 'manager') && (
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton
                          onClick={() => handlePropertyEdit(property)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handlePropertyDelete(property.property_id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Rooms Tab */}
      {activeTab === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">Manage Rooms</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Property</InputLabel>
                <Select
                  value={selectedProperty || ''}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  label="Select Property"
                >
                  {properties.map((property) => (
                    <MenuItem key={property.property_id} value={property.property_id}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedProperty && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenRoomDialog(true)}
                >
                  Add Room
                </Button>
              )}
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Floor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.room_id}>
                    <TableCell>{room.name}</TableCell>
                    <TableCell>{room.type || 'N/A'}</TableCell>
                    <TableCell>{room.floor || 'N/A'}</TableCell>
                    <TableCell>{room.status}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => {
                          setRoomFormData(room);
                          setOpenRoomDialog(true);
                        }}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteRoom(room.room_id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* After the Rooms Tab section, add the Users Tab */}
      {activeTab === 2 && (auth.role === 'super_admin' || auth.role === 'manager') && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">Manage User Assignments</Typography>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Assigned Properties</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <FormControl fullWidth>
                        <Select
                          multiple
                          value={user.assigned_properties?.map(p => p.property_id) || []}
                          onChange={(e) => handleUserPropertyAssignment(user.id, e.target.value)}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((propertyId) => {
                                const property = properties.find(p => p.property_id === propertyId);
                                return (
                                  <Chip
                                    key={propertyId}
                                    label={property ? property.name : 'Unknown'}
                                    size="small"
                                  />
                                );
                              })}
                            </Box>
                          )}
                        >
                          {properties.map((property) => (
                            <MenuItem key={property.property_id} value={property.property_id}>
                              {property.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Property Dialog */}
      <Dialog open={openPropertyDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {propertyFormData.property_id ? 'Edit Property' : 'Add New Property'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Property Name"
              name="name"
              value={propertyFormData.name}
              onChange={(e) => setPropertyFormData({ ...propertyFormData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={propertyFormData.address}
              onChange={(e) => setPropertyFormData({ ...propertyFormData, address: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Type"
              name="type"
              value={propertyFormData.type}
              onChange={(e) => setPropertyFormData({ ...propertyFormData, type: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={propertyFormData.description}
              onChange={(e) => setPropertyFormData({ ...propertyFormData, description: e.target.value })}
              margin="normal"
              multiline
              rows={4}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={propertyFormData.status}
                onChange={(e) => setPropertyFormData({ ...propertyFormData, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handlePropertySubmit} variant="contained" color="primary">
            {propertyFormData.property_id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Room Dialog */}
      <Dialog open={openRoomDialog} onClose={() => setOpenRoomDialog(false)}>
        <DialogTitle>
          {roomFormData.room_id ? 'Edit Room' : 'Add New Room'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Room Name"
              name="name"
              value={roomFormData.name}
              onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Type"
              name="type"
              value={roomFormData.type}
              onChange={(e) => setRoomFormData({ ...roomFormData, type: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Floor"
              name="floor"
              value={roomFormData.floor}
              onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={roomFormData.status}
                onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="Available">Available</MenuItem>
                <MenuItem value="Occupied">Occupied</MenuItem>
                <MenuItem value="Maintenance">Maintenance</MenuItem>
                <MenuItem value="Cleaning">Cleaning</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenRoomDialog(false);
            resetRoomForm();
          }}>
            Cancel
          </Button>
          <Button onClick={handleRoomSubmit} variant="contained" color="primary">
            {roomFormData.room_id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PropertyManagement; 