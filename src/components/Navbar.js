import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Home, 
  Menu as MenuIcon, 
  AccountCircle as AccountCircleIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

const Navbar = () => {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    handleClose();
  };

  const renderMenuItems = () => {
    const items = [
      <MenuItem key="home" onClick={() => handleMenuClick('/')} sx={{ minWidth: '200px' }}>
        <ListItemIcon>
          <Home />
        </ListItemIcon>
        <ListItemText primary="Home" />
      </MenuItem>
    ];

    if (auth.role === 'super_admin') {
      items.push(
        <MenuItem key="users" onClick={() => handleMenuClick('/users')}>
          <ListItemIcon>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText>Manage Users</ListItemText>
        </MenuItem>,
        <MenuItem key="properties" onClick={() => handleMenuClick('/properties')}>
          <ListItemIcon>
            <BusinessIcon />
          </ListItemIcon>
          <ListItemText>Manage Properties</ListItemText>
        </MenuItem>
      );
    }

    if (auth.role === 'manager') {
      items.push(
        <MenuItem key="properties" onClick={() => handleMenuClick('/properties')}>
          <ListItemIcon>
            <BusinessIcon />
          </ListItemIcon>
          <ListItemText>Manage Property</ListItemText>
        </MenuItem>
      );
    }

    items.push(
      <MenuItem key="tickets" onClick={() => handleMenuClick('/tickets')}>
        <ListItemIcon>
          <ConfirmationNumberIcon />
        </ListItemIcon>
        <ListItemText>Tickets</ListItemText>
      </MenuItem>,
      <MenuItem key="tasks" onClick={() => handleMenuClick('/tasks')}>
        <ListItemIcon>
          <AssignmentIcon />
        </ListItemIcon>
        <ListItemText>Tasks</ListItemText>
      </MenuItem>
    );

    return items;
  };

  // Add a check for auth
  if (!auth) return null;

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
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          {renderMenuItems()}
        </Menu>

        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Property Management System
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={<AccountCircleIcon />}
            label={`${auth.username || 'User'} (${auth.role})`}
            color="secondary"
            variant="outlined"
            sx={{ 
              color: 'white',
              borderColor: 'white',
              '& .MuiSvgIcon-root': { color: 'white' }
            }}
          />
          <Button color="inherit" onClick={logout}>Logout</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 