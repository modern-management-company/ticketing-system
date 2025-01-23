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
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

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
    const items = [];

    if (auth.role === 'super_admin') {
      items.push(
        <MenuItem key="users" onClick={() => handleMenuClick('/users')}>Manage Users</MenuItem>,
        <MenuItem key="properties" onClick={() => handleMenuClick('/properties')}>Manage Properties</MenuItem>
      );
    }

    if (auth.role === 'manager') {
      items.push(
        <MenuItem key="properties" onClick={() => handleMenuClick('/properties')}>Manage Property</MenuItem>
      );
    }

    items.push(
      <MenuItem key="tickets" onClick={() => handleMenuClick('/tickets')}>Tickets</MenuItem>,
      <MenuItem key="tasks" onClick={() => handleMenuClick('/tasks')}>Tasks</MenuItem>
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