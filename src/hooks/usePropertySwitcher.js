import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const usePropertySwitcher = () => {
  const { user } = useAuth();
  const [currentProperty, setCurrentProperty] = useState(null);
  const [availableProperties, setAvailableProperties] = useState([]);

  useEffect(() => {
    if (user) {
      // Mock data for testing
      setAvailableProperties([
        { property_id: 1, name: 'Test Hotel' }
      ]);
      setCurrentProperty({ property_id: 1, name: 'Test Hotel' });
    }
  }, [user]);

  return {
    currentProperty,
    availableProperties,
    setCurrentProperty
  };
}; 