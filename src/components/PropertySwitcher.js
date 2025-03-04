import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress, Box, Chip, Alert } from '@mui/material';
import apiClient from './apiClient';

const PropertySwitcher = ({ onPropertyChange, initialValue }) => {
  const { auth } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(initialValue || '');

  useEffect(() => {
    fetchProperties();
  }, [auth]);

  // Update selected property when initialValue changes
  useEffect(() => {
    if (initialValue) {
      setSelectedProperty(initialValue);
    }
  }, [initialValue]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use different endpoints based on user role
      const endpoint = auth.user.role === 'super_admin' 
        ? '/properties'
        : `/users/${auth.user.user_id}/managed-properties`;
      
      const response = await apiClient.get(endpoint);
      console.log('Properties response:', response.data);
      
      if (response.data) {
        // Filter only active properties
        const activeProperties = Array.isArray(response.data) 
          ? response.data.filter(prop => prop.status === 'active')
          : response.data.properties?.filter(prop => prop.status === 'active') || [];
        
        setProperties(activeProperties);
        
        // If no property is selected, select the first one
        if ((!selectedProperty || selectedProperty === '') && activeProperties.length > 0) {
          const firstPropertyId = activeProperties[0].property_id;
          setSelectedProperty(firstPropertyId);
          onPropertyChange(firstPropertyId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (event) => {
    const newPropertyId = event.target.value;
    setSelectedProperty(newPropertyId);
    onPropertyChange(newPropertyId);
  };

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  if (properties.length === 0) return <Alert severity="info">No properties available</Alert>;

  return (
    <FormControl sx={{ minWidth: 200 }}>
      <InputLabel>Select Property</InputLabel>
      <Select
        value={selectedProperty}
        onChange={handlePropertyChange}
        label="Select Property"
      >
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