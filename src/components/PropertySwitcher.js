import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import apiClient from './apiClient';

const PropertySwitcher = () => {
  const { auth, switchProperty } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        let endpoint = '/properties';
        const response = await apiClient.get(endpoint);
        setProperties(response.data.properties);
      } catch (error) {
        console.error('Failed to fetch properties:', error);
        setError('Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [auth]);

  const handlePropertyChange = async (propertyId) => {
    try {
      await apiClient.post('/switch-property', { property_id: propertyId });
      switchProperty(propertyId);
    } catch (error) {
      console.error('Failed to switch property:', error);
      setError('Failed to switch property');
    }
  };

  if (loading) return <CircularProgress size={24} />;
  if (error) return null;

  return (
    <FormControl sx={{ minWidth: 120, mr: 2 }}>
      <Select
        value={auth.managedPropertyId || auth.assignedPropertyId || ''}
        onChange={(e) => handlePropertyChange(e.target.value)}
        displayEmpty
        sx={{ color: 'white', '& .MuiSelect-icon': { color: 'white' } }}
      >
        <MenuItem value="" disabled>
          Select Property
        </MenuItem>
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