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
  CircularProgress,
  Tabs,
  Tab,
  List,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
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
    description: '',
    subscription_plan: 'basic', // 'basic' or 'premium'
    has_attachments: false
  });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [managersDialogOpen, setManagersDialogOpen] = useState(false);
  const [propertyManagers, setPropertyManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

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
        description: propertyFormData.description || '',
        subscription_plan: propertyFormData.subscription_plan,
        has_attachments: propertyFormData.has_attachments
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
      description: property.description || '',
      subscription_plan: property.subscription_plan || 'basic',
      has_attachments: property.has_attachments || false
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
      description: '',
      subscription_plan: 'basic',
      has_attachments: false
    });
  };

  const fetchPropertyManagers = async (propertyId) => {
    try {
      setLoadingManagers(true);
      const response = await apiClient.get(`/properties/${propertyId}/managers`);
      setPropertyManagers(response.data?.managers || []);
    } catch (error) {
      console.error('Failed to fetch property managers:', error);
      setError('Failed to load property managers');
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleShowManagers = (property) => {
    setSelectedProperty(property);
    setManagersDialogOpen(true);
    fetchPropertyManagers(property.property_id);
  };

  const calculateMonthlyCost = (property) => {
    const baseCost = 20; // Basic plan cost
    const attachmentCost = 10; // Attachment add-on cost
    return baseCost + (property.has_attachments ? attachmentCost : 0);
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

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Properties" />
        <Tab label="Subscription Overview" />
      </Tabs>

      {activeTab === 0 ? (
        properties.length === 0 ? (
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
                    <Box sx={{ mt: 1, mb: 2 }}>
                      <Chip 
                        label={`${property.subscription_plan === 'premium' ? 'Premium' : 'Basic'} Plan`}
                        color={property.subscription_plan === 'premium' ? 'primary' : 'default'}
                        size="small"
                      />
                      {property.has_attachments && (
                        <Chip 
                          label="Attachments Enabled" 
                          color="secondary" 
                          size="small" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="primary">
                      Monthly Cost: ${calculateMonthlyCost(property)}
                    </Typography>
                    {property.description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {property.description}
                      </Typography>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        onClick={() => handleShowManagers(property)}
                      >
                        Show Managers
                      </Button>
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
        )
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Plan
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  $20/month
                </Typography>
                <List>
                  <Typography variant="body2">• Core Ticketing System</Typography>
                  <Typography variant="body2">• Basic Support</Typography>
                  <Typography variant="body2">• Ticket creation & assignment</Typography>
                  <Typography variant="body2">• Property & room management</Typography>
                  <Typography variant="body2">• Task management features</Typography>
                  <Typography variant="body2">• Email/SMS notifications (basic)</Typography>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attachments Add-on
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  +$10/month
                </Typography>
                <List>
                  <Typography variant="body2">• File Attachment Storage & Management</Typography>
                  <Typography variant="body2">• Integrated Cloud Storage (Supabase)</Typography>
                  <Typography variant="body2">• Secure file uploads/downloads</Typography>
                  <Typography variant="body2">• Direct file access in tickets</Typography>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Property Dialog */}
      <Dialog open={openPropertyDialog} onClose={() => setOpenPropertyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {propertyFormData.property_id ? 'Edit Property' : 'Add New Property'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Property Name"
              value={propertyFormData.name}
              onChange={(e) => setPropertyFormData({ ...propertyFormData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Address"
              value={propertyFormData.address}
              onChange={(e) => setPropertyFormData({ ...propertyFormData, address: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Type"
              value={propertyFormData.type}
              onChange={(e) => setPropertyFormData({ ...propertyFormData, type: e.target.value })}
              margin="normal"
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
            <FormControl fullWidth margin="normal">
              <InputLabel>Subscription Plan</InputLabel>
              <Select
                value={propertyFormData.subscription_plan}
                onChange={(e) => setPropertyFormData({ ...propertyFormData, subscription_plan: e.target.value, has_attachments: e.target.value === 'premium' ? propertyFormData.has_attachments : false })}
                label="Subscription Plan"
              >
                <MenuItem value="basic">Basic ($20/month)</MenuItem>
                <MenuItem value="premium">Premium ($30/month)</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={propertyFormData.has_attachments}
                  onChange={(e) => setPropertyFormData({ ...propertyFormData, has_attachments: e.target.checked })}
                  disabled={propertyFormData.subscription_plan !== 'premium'}
                />
              }
              label="Enable Attachments (+$10/month)"
            />
            <TextField
              fullWidth
              label="Description"
              value={propertyFormData.description}
              onChange={(e) => setPropertyFormData({ ...propertyFormData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
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

      {/* Property Managers Dialog */}
      <Dialog 
        open={managersDialogOpen} 
        onClose={() => setManagersDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedProperty ? `Managers for ${selectedProperty.name}` : 'Property Managers'}
        </DialogTitle>
        <DialogContent>
          {loadingManagers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : propertyManagers.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {propertyManagers.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell>{manager.name || manager.username}</TableCell>
                      <TableCell>{manager.email}</TableCell>
                      <TableCell>{manager.role}</TableCell>
                      <TableCell>{manager.group || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No managers assigned to this property</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManagersDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PropertyManagement; 