import React, { useEffect, useState } from "react";
import apiClient from "./apiClient"; 
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
  TextField,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const ManageProperties = () => {
  const { auth } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editProperty, setEditProperty] = useState(null);
  const [message, setMessage] = useState('');
  const [newProperty, setNewProperty] = useState({
    name: '',
    address: '',
    type: '',
    status: 'active'
  });

  const propertyTypes = ['Hotel', 'Apartment', 'Office', 'Retail'];
  const propertyStatuses = ['active', 'inactive', 'maintenance'];

  useEffect(() => {
    fetchProperties();
  }, [auth]);

  const fetchProperties = async () => {
    try {
      let endpoint = '/properties';
      if (auth?.role === 'manager' && auth?.managedPropertyId) {
        endpoint = `/properties/${auth.managedPropertyId}`;
      }

      const response = await apiClient.get(endpoint);
      
      if (response.data?.properties) {
        setProperties(response.data.properties);
      } else if (response.data && Array.isArray(response.data)) {
        setProperties(response.data);
      } else {
        setProperties([]);
      }
      
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError(error.message || 'Failed to fetch properties');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error) => {
    const errorMessage = error?.response?.data?.msg 
      || error?.message 
      || 'An unexpected error occurred';
    setError(errorMessage);
    console.error('Operation failed:', error);
  };

  const handleEdit = async (propertyId) => {
    if (!editProperty) return;
    
    try {
      const response = await apiClient.patch(`/properties/${propertyId}`, editProperty);
      if (response.data?.property) {
        setProperties(properties.map(prop => 
          prop.property_id === propertyId ? response.data.property : prop
        ));
        setEditProperty(null);
        setMessage('Property updated successfully');
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    if (!newProperty.name || !newProperty.address || !newProperty.type) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const response = await apiClient.post('/properties', newProperty);
      if (response.data?.property) {
        setProperties([...properties, response.data.property]);
        setNewProperty({
          name: '',
          address: '',
          type: '',
          status: 'active'
        });
        setMessage('Property created successfully');
      }
    } catch (error) {
      handleError(error);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Manage Properties
      </Typography>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Add Property Form */}
      {auth.role === 'super_admin' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Add New Property
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Property Name"
                value={newProperty.name}
                onChange={(e) => setNewProperty(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Address"
                value={newProperty.address}
                onChange={(e) => setNewProperty(prev => ({ ...prev, address: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newProperty.type}
                  onChange={(e) => setNewProperty(prev => ({ ...prev, type: e.target.value }))}
                >
                  {propertyTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newProperty.status}
                  onChange={(e) => setNewProperty(prev => ({ ...prev, status: e.target.value }))}
                >
                  {propertyStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleAddProperty}
                disabled={!newProperty.name || !newProperty.address || !newProperty.type}
              >
                Add Property
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Properties List */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.property_id}>
                <TableCell>
                  {editProperty?.property_id === property.property_id ? (
                    <TextField
                      value={editProperty.name}
                      onChange={(e) => setEditProperty(prev => ({ ...prev, name: e.target.value }))}
                    />
                  ) : (
                    property.name
                  )}
                </TableCell>
                <TableCell>
                  {editProperty?.property_id === property.property_id ? (
                    <TextField
                      value={editProperty.address}
                      onChange={(e) => setEditProperty(prev => ({ ...prev, address: e.target.value }))}
                    />
                  ) : (
                    property.address
                  )}
                </TableCell>
                <TableCell>
                  {editProperty?.property_id === property.property_id ? (
                    <Select
                      value={editProperty.type}
                      onChange={(e) => setEditProperty(prev => ({ ...prev, type: e.target.value }))}
                    >
                      {propertyTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  ) : (
                    property.type
                  )}
                </TableCell>
                <TableCell>
                  {editProperty?.property_id === property.property_id ? (
                    <Select
                      value={editProperty.status}
                      onChange={(e) => setEditProperty(prev => ({ ...prev, status: e.target.value }))}
                    >
                      {propertyStatuses.map(status => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  ) : (
                    property.status
                  )}
                </TableCell>
                <TableCell>
                  {editProperty?.property_id === property.property_id ? (
                    <>
                      <Button onClick={() => handleEdit(property.property_id)}>Save</Button>
                      <Button onClick={() => setEditProperty(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditProperty(property)}>Edit</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ManageProperties;
