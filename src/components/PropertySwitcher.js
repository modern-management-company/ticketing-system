import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress, Box, Chip, Alert } from '@mui/material';
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
      setError(null);
      
      const response = await apiClient.get('/properties');
      console.log('Properties response:', response.data);
      
      if (response.data) {
        // Filter only active properties
        const activeProperties = response.data.filter(prop => prop.status === 'active');
        setProperties(activeProperties);
        
        // Set default property
        if (activeProperties.length > 0) {
          // If user has assigned properties, use the first assigned active one
          if (auth.assigned_properties && auth.assigned_properties.length > 0) {
            const assignedActiveProperty = auth.assigned_properties.find(p => 
              activeProperties.some(ap => ap.property_id === p.property_id)
            );
            if (assignedActiveProperty) {
              setSelectedProperty(assignedActiveProperty.property_id);
              if (onPropertyChange) {
                onPropertyChange(assignedActiveProperty.property_id);
              }
            }
          } else {
            // Otherwise use the first available active property
            const defaultProperty = activeProperties[0].property_id;
            setSelectedProperty(defaultProperty);
            if (onPropertyChange) {
              onPropertyChange(defaultProperty);
            }
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
        value={selectedProperty || ''}
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