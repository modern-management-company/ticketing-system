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

const PropertyManagement = () => {
  const { auth } = useAuth();
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openPropertyDialog, setOpenPropertyDialog] = useState(false);
  const [propertyFormData, setPropertyFormData] = useState({
    name: '',
    address: '',
    type: '',
    status: 'active',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propertiesResponse, usersResponse] = await Promise.all([
        apiClient.get('/properties'),
        auth.role === 'super_admin' ? apiClient.get('/users') : null
      ]);

      console.log('Properties response:', propertiesResponse.data);

      if (propertiesResponse.data) {
        setProperties(propertiesResponse.data);
      }

      if (usersResponse?.data?.users) {
        setUsers(usersResponse.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      if (!propertyFormData.name || !propertyFormData.address) {
        setError('Name and address are required fields');
        return;
      }
      
      const payload = {
        name: propertyFormData.name.trim(),
        address: propertyFormData.address.trim(),
        type: propertyFormData.type || '',
        status: propertyFormData.status || 'active',
        description: propertyFormData.description || ''
      };

      let response;
      if (propertyFormData.property_id) {
        response = await apiClient.put(`/properties/${propertyFormData.property_id}`, payload);
        setSuccess('Property updated successfully');
      } else {
        response = await apiClient.post('/properties', payload);
        setSuccess('Property created successfully');
      }
      
      await fetchData();
      setOpenPropertyDialog(false);
      resetPropertyForm();
    } catch (error) {
      console.error('Failed to save property:', error);
      setError(error.response?.data?.message || 'Failed to save property');
    }
  };

  const handlePropertyEdit = (property) => {
    console.log('Editing property:', property);
    setPropertyFormData({
      property_id: property.property_id,
      name: property.name || '',
      address: property.address || '',
      type: property.type || '',
      status: property.status || 'active',
      description: property.description || ''
    });
    setOpenPropertyDialog(true);
  };

  const handlePropertyDelete = async (propertyId) => {
    const warningMessage = `WARNING: Deleting this property will permanently remove:\n\n` +
      `• All rooms in the property\n` +
      `• All tickets associated with the property\n` +
      `• All tasks and task assignments\n` +
      `• All service requests\n` +
      `• All user and manager property assignments\n\n` +
      `This action cannot be undone. Are you sure you want to proceed?`;

    if (!window.confirm(warningMessage)) return;
    
    try {
      setError('');
      setSuccess('');
      
      await apiClient.delete(`/properties/${propertyId}`);
      setSuccess('Property and all associated data deleted successfully');
      await fetchData();
    } catch (error) {
      console.error('Failed to delete property:', error);
      setError(error.response?.data?.message || 'Failed to delete property');
    }
  };

  const handleUserPropertyAssignment = async (userId, propertyIds) => {
    try {
      await apiClient.post('/assign-property', {
        user_id: userId,
        property_ids: propertyIds
      });
      setSuccess('User property assignments updated successfully');
      await fetchData();
    } catch (error) {
      console.error('Failed to update user property assignments:', error);
      setError(error.response?.data?.message || 'Failed to update user property assignments');
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

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Property Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetPropertyForm();
            setOpenPropertyDialog(true);
          }}
        >
          Add Property
        </Button>
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

      {properties.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>No properties found</Alert>
      ) : (
        <Grid container spacing={3}>
          {properties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.property_id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{property.name}</Typography>
                  <Typography color="textSecondary">{property.address}</Typography>
                  <Typography>Type: {property.type || 'N/A'}</Typography>
                  <Typography>Status: {property.status}</Typography>
                  {property.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {property.description}
                    </Typography>
                  )}
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
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Property Dialog */}
      <Dialog open={openPropertyDialog} onClose={() => setOpenPropertyDialog(false)}>
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
          <Button onClick={() => setOpenPropertyDialog(false)}>Cancel</Button>
          <Button onClick={handlePropertySubmit} variant="contained" color="primary">
            {propertyFormData.property_id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Property Assignment Section */}
      {auth.role === 'super_admin' && users.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>User Property Assignments</Typography>
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
        </Box>
      )}
    </Box>
  );
};

export default PropertyManagement; 