import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress, Box, Chip } from '@mui/material';
import apiClient from './apiClient';

const PropertySwitcher = ({ onPropertyChange }) => {
  const { auth } = useAuth();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, [auth]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/properties');
      if (response.data && Array.isArray(response.data)) {
        setProperties(response.data);
        if (response.data.length > 0) {
          const defaultProperty = response.data[0].property_id;
          setSelectedProperty(defaultProperty);
          if (onPropertyChange) {
            onPropertyChange(defaultProperty);
          }
        }
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
      await apiClient.post('/switch-property', { property_id: propertyId });
      if (onPropertyChange) {
        onPropertyChange(propertyId);
      }
    } catch (error) {
      console.error('Failed to switch property:', error);
      setError('Failed to switch property');
    }
  };

  if (loading) return <CircularProgress size={24} />;
  if (error) return null;

  return (
    <FormControl sx={{ minWidth: 200 }}>
      <InputLabel>Select Property</InputLabel>
      <Select
        value={selectedProperty}
        onChange={(e) => handlePropertyChange(e.target.value)}
        label="Select Property"
        renderValue={(selected) => {
          const property = properties.find(p => p.property_id === selected);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip 
                label={property ? property.name : 'Select Property'} 
                size="small"
                color="primary"
              />
            </Box>
          );
        }}
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