import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress, Box, Chip, Alert } from '@mui/material';
import apiClient from './apiClient';

const PropertySwitcher = ({ onPropertyChange, initialValue }) => {
  const { auth } = useAuth();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, [auth]);

  useEffect(() => {
    setSelectedProperty(initialValue);
  }, [initialValue]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/properties');
      console.log('Properties response:', response.data);
      
      if (response.data) {
        // Filter only active properties
        const activeProperties = response.data.filter(prop => prop.status === 'active');
        setProperties(activeProperties);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = async (propertyId) => {
    try {
      setSelectedProperty(propertyId);
      if (onPropertyChange) {
        onPropertyChange(propertyId);
      }
    } catch (error) {
      console.error('Failed to switch property:', error);
      setError('Failed to switch property');
    }
  };

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  if (properties.length === 0) return <Alert severity="info">No properties available</Alert>;

  return (
    <FormControl sx={{ minWidth: 200 }}>
      <InputLabel>Select Property</InputLabel>
      <Select
        value={selectedProperty || 'all'}
        onChange={(e) => handlePropertyChange(e.target.value)}
        label="Select Property"
      >
        <MenuItem value="all">All Properties</MenuItem>
        {properties.map((property) => (
          <MenuItem key={property.property_id} value={property.property_id}>
            {property.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default PropertySwitcher; 