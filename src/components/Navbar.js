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
  InputLabel,
  Button,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle as AccountCircleIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const Navbar = () => {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
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
      setProperties(response.data?.properties || []);
      if (response.data?.properties?.length > 0) {
        setSelectedProperty(response.data.properties[0].property_id);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setError('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = async (event) => {
    const propertyId = event.target.value;
    setSelectedProperty(propertyId);
    try {
      await apiClient.post('/switch-property', { property_id: propertyId });
      window.location.reload();
    } catch (error) {
      setError('Failed to switch property');
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleClose();
    handleSettingsClose();
  };

  const menuItems = [
    {
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      roles: ['user', 'manager', 'super_admin']
    },
    {
      label: 'Tickets',
      icon: <ConfirmationNumberIcon />,
      path: '/tickets',
      roles: ['user', 'manager', 'super_admin']
    },
    {
      label: 'Tasks',
      icon: <AssignmentIcon />,
      path: '/tasks',
      roles: ['user', 'manager', 'super_admin']
    },
    {
      label: 'Rooms',
      icon: <BusinessIcon />,
      path: '/rooms',
      roles: ['user', 'manager', 'super_admin']
    },
    {
      label: 'Properties',
      icon: <BusinessIcon />,
      path: '/admin/properties',
      roles: ['manager', 'super_admin']
    },
    {
      label: 'Users',
      icon: <PeopleIcon />,
      path: '/admin/users',
      roles: ['super_admin']
    }
  ];

  if (!auth?.isAuthenticated) return null;

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={handleMenu}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Ticketing System
        </Typography>

        {(auth.role === 'manager' || auth.role === 'super_admin') && (
          <FormControl sx={{ minWidth: 200, mr: 2, backgroundColor: 'white', borderRadius: 1 }}>
            <InputLabel>Select Property</InputLabel>
            <Select
              value={selectedProperty}
              onChange={handlePropertyChange}
              label="Select Property"
              size="small"
            >
              {properties.map((property) => (
                <MenuItem key={property.property_id} value={property.property_id}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`${auth.user?.username} (${auth.role}${auth.user?.group ? ` - ${auth.user.group}` : ''})`}
            color="secondary"
            sx={{ mr: 1 }}
          />

          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          sx={{ mt: 1 }}
        >
          {menuItems
            .filter(item => item.roles.includes(auth.role))
            .map((item) => (
              <MenuItem
                key={item.path}
                onClick={() => handleNavigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </MenuItem>
            ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;