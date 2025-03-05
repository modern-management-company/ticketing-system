import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress, Box, Chip, Alert } from '@mui/material';

const PropertySwitcher = ({ onPropertyChange, initialValue }) => {
  const { auth, fetchProperties } = useAuth();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(initialValue || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProperties();
  }, [auth]);

  // Update local state when initialValue changes
  useEffect(() => {
    if (initialValue) {
      setSelectedProperty(initialValue);
    }
  }, [initialValue]);

  // Add this useEffect to debug the issue
  useEffect(() => {
    console.log('PropertySwitcher state:', {
      selectedProperty,
      propertiesLength: properties.length,
      initialValue
    });
  }, [selectedProperty, properties, initialValue]);

  const loadProperties = async () => {
    if (!fetchProperties) {
      console.error('fetchProperties is not available in AuthContext');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Use the cached properties from AuthContext
      const propertiesData = await fetchProperties();
      console.log('Properties loaded:', propertiesData);
      
      if (propertiesData) {
        // Filter only active properties
        const activeProperties = propertiesData.filter(prop => prop.status === 'active');
        setProperties(activeProperties);
        
        // If we have an initialValue or selectedProperty, make sure it's in the properties list
        const currentPropertyId = initialValue || selectedProperty;
        if (currentPropertyId) {
          const propertyExists = activeProperties.some(p => p.property_id === parseInt(currentPropertyId));
          if (!propertyExists) {
            console.log(`Selected property ${currentPropertyId} not found in active properties`);
            // If the property doesn't exist in the active properties, select the first one
            if (activeProperties.length > 0) {
              const defaultProperty = activeProperties[0].property_id;
              setSelectedProperty(defaultProperty);
              if (onPropertyChange) {
                onPropertyChange(defaultProperty);
              }
            }
          } else {
            // Ensure the selected property is set
            setSelectedProperty(currentPropertyId);
          }
        }
        // Set default property only if no property is currently selected
        else if (activeProperties.length > 0 && !currentPropertyId) {
          // If user has assigned properties, use the first assigned active one
          if (auth?.assigned_properties && auth.assigned_properties.length > 0) {
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
      console.error('Failed to load properties:', error);
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
          // Try to parse the selected value as an integer if it's a string
          const propertyId = typeof selected === 'string' ? parseInt(selected, 10) : selected;
          
          // Find the property in the properties array
          const property = properties.find(p => p.property_id === propertyId);
          
          // For debugging
          if (!property && selected) {
            console.log(`Property not found for ID: ${selected}`, {
              selectedType: typeof selected,
              parsedId: propertyId,
              availableProperties: properties.map(p => p.property_id)
            });
          }
          
          // If property is found, show its name
          // If not found but we have a selected value, show "Loading..." to indicate it's being fetched
          // Otherwise show "Select Property"
          const displayText = property ? property.name : 
                             (selected ? `Property ${selected}` : "Select Property");
          
          return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip 
                label={displayText}
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