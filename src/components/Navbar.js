import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  ListItemIcon,
  ListItemText,
  Select,
  FormControl,
  Tooltip,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Home, 
  Menu as MenuIcon, 
  AccountCircle as AccountCircleIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';

const Navbar = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (auth && (auth.role === 'manager' || auth.role === 'super_admin')) {
      fetchProperties();
    }
  }, [auth]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/properties');
      setProperties(response.data.properties);
      if (response.data.properties.length > 0) {
        setSelectedProperty(response.data.properties[0].property_id);
      }
    } catch (error) {
      setError('Failed to fetch properties');
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = async (event) => {
    const propertyId = event.target.value;
    setSelectedProperty(propertyId);
    try {
      await apiClient.post('/settings/current-property', { property_id: propertyId });
      // Optionally refresh the page or update necessary components
      window.location.reload();
    } catch (error) {
      setError('Failed to switch property');
      console.error('Failed to switch property:', error);
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSettingsMenu = (event) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    handleClose();
    handleSettingsClose();
  };

  const getNavigationItems = (auth) => {
    const items = [
      {
        key: 'dashboard',
        path: '/dashboard',
        icon: <Home />,
        text: 'Dashboard',
        roles: ['user', 'manager', 'super_admin']
      },
      {
        key: 'tickets',
        path: '/tickets',
        icon: <ConfirmationNumberIcon />,
        text: 'Tickets',
        roles: ['user', 'manager', 'super_admin']
      },
      {
        key: 'tasks',
        path: '/tasks',
        icon: <AssignmentIcon />,
        text: 'Tasks',
        roles: ['user', 'manager', 'super_admin']
      }
    ];

    // Add management items based on role
    if (auth.role === 'super_admin' || auth.role === 'manager') {
      items.push(
        {
          key: 'rooms',
          path: '/rooms',
          icon: <BusinessIcon />,
          text: 'Rooms',
          roles: ['manager', 'super_admin']
        },
        {
          key: 'properties',
          path: '/admin/properties',
          icon: <BusinessIcon />,
          text: 'Properties',
          roles: ['manager', 'super_admin']
        }
      );
    }

    // Add user management for super admin
    if (auth.role === 'super_admin') {
      items.push({
        key: 'users',
        path: '/admin/users',
        icon: <PeopleIcon />,
        text: 'User Management',
        roles: ['super_admin']
      });
    }

    return items;
  };

  const getSettingsItems = (auth) => {
    const items = [];

    if (auth.role === 'super_admin' || auth.role === 'manager') {
      items.push({
        key: 'property-theme',
        path: '/settings/property',
        icon: <PaletteIcon />,
        text: 'Property Theme',
        roles: ['manager', 'super_admin']
      });
    }

    if (auth.role === 'super_admin') {
      items.push({
        key: 'system-settings',
        path: '/settings/system',
        icon: <SettingsIcon />,
        text: 'System Settings',
        roles: ['super_admin']
      });
    }

    return items;
  };

  const renderMenuItems = () => {
    const items = getNavigationItems(auth);

    return items
      .filter(item => item.roles.includes(auth?.role))
      .map(item => (
        <MenuItem 
          key={item.key} 
          onClick={() => handleMenuClick(item.path)}
          sx={{ 
            minWidth: '200px',
            '&:hover': {
              backgroundColor: 'primary.light',
              '& .MuiListItemIcon-root': {
                color: 'primary.main',
              },
            },
          }}
        >
          <ListItemIcon>
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.text} />
        </MenuItem>
      ));
  };

  const renderSettingsMenu = () => {
    const items = getSettingsItems(auth);

    return items
      .filter(item => item.roles.includes(auth?.role))
      .map(item => (
        <MenuItem 
          key={item.key} 
          onClick={() => handleMenuClick(item.path)}
          sx={{ 
            minWidth: '200px',
            '&:hover': {
              backgroundColor: 'primary.light',
              '& .MuiListItemIcon-root': {
                color: 'primary.main',
              },
            },
          }}
        >
          <ListItemIcon>
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.text} />
        </MenuItem>
      ));
  };

  if (!auth || (auth.role !== 'manager' && auth.role !== 'super_admin')) {
    return null;
  }

  return (
    <AppBar 
      position="fixed" 
      color="default" 
      elevation={0}
      sx={{ 
        top: 64, // Below main AppBar
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer - 1
      }}
    >
      <Toolbar variant="dense">
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Typography variant="body1" color="textSecondary" sx={{ mr: 2 }}>
            Current Property:
          </Typography>
          
          {loading ? (
            <CircularProgress size={24} sx={{ ml: 2 }} />
          ) : error ? (
            <Alert severity="error" sx={{ ml: 2 }}>
              {error}
            </Alert>
          ) : (
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 200,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                }
              }}
            >
              <Select
                value={selectedProperty}
                onChange={handlePropertyChange}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) {
                    return <Typography color="textSecondary">Select a property</Typography>;
                  }
                  const property = properties.find(p => p.property_id === selected);
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={property?.name || 'Unknown Property'} 
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
          )}
        </Box>
        {auth?.user && (
          <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              Logged in as: {auth.user.username}
            </Typography>
            <Typography variant="body2" sx={{ mr: 2 }}>
              Role: {auth.user.role}
            </Typography>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;