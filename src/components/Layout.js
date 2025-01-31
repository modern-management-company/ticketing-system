import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  ListItemButton,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';

// Import specific icons instead of the entire library
import MenuIcon from '@mui/icons-material/Menu';
import { 
  Dashboard as DashboardIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  MeetingRoom as MeetingRoomIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const Layout = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!auth) {
    navigate('/login');
    return null;
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Organize menu items by sections
  const mainMenuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/dashboard', 
      roles: ['user', 'manager', 'super_admin'],
      description: 'View system overview'
    },
    { 
      text: 'Tickets', 
      icon: <ConfirmationNumberIcon />, 
      path: '/tickets', 
      roles: ['user', 'manager', 'super_admin'],
      description: 'Manage support tickets'
    },
    { 
      text: 'Tasks', 
      icon: <AssignmentIcon />, 
      path: '/tasks', 
      roles: ['user', 'manager', 'super_admin'],
      description: 'View and manage tasks'
    }
  ];

  const propertyMenuItems = [
    { 
      text: 'Rooms', 
      icon: <MeetingRoomIcon />, 
      path: '/rooms', 
      roles: ['manager', 'super_admin'],
      description: 'Manage property rooms'
    }
  ];

  const settingsMenuItems = [
    { 
      text: 'Property Theme', 
      icon: <PaletteIcon />, 
      path: '/settings/property', 
      roles: ['manager', 'super_admin'],
      description: 'Customize property theme'
    },
    { 
      text: 'System Settings', 
      icon: <SettingsIcon />, 
      path: '/settings/system', 
      roles: ['super_admin'],
      description: 'Manage system settings'
    }
  ];

  const adminMenuItems = [
    { 
      text: 'Properties', 
      icon: <BusinessIcon />, 
      path: '/admin/properties', 
      roles: ['super_admin'],
      description: 'Manage all properties'
    },
    { 
      text: 'Users', 
      icon: <PeopleIcon />, 
      path: '/admin/users', 
      roles: ['super_admin'],
      description: 'Manage system users'
    }
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          {auth.role === 'super_admin' ? 'Admin Panel' : 'User Panel'}
        </Typography>
      </Toolbar>
      <List sx={{ flexGrow: 1 }}>
        {/* Main Menu Section */}
        {mainMenuItems.map((item) => (
          item.roles.includes(auth?.role) && (
            <ListItemButton
              key={item.text}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                secondary={auth.role === 'super_admin' ? item.description : null}
                secondaryTypographyProps={{
                  sx: { color: location.pathname === item.path ? 'rgba(255,255,255,0.7)' : 'inherit' }
                }}
              />
            </ListItemButton>
          )
        ))}

        {/* Property Management Section */}
        {propertyMenuItems.some(item => item.roles.includes(auth?.role)) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="textSecondary" sx={{ px: 3, py: 1 }}>
              Property Management
            </Typography>
            {propertyMenuItems.map((item) => (
              item.roles.includes(auth?.role) && (
                <ListItemButton
                  key={item.text}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  selected={location.pathname === item.path}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    secondary={auth.role === 'super_admin' ? item.description : null}
                    secondaryTypographyProps={{
                      sx: { color: location.pathname === item.path ? 'rgba(255,255,255,0.7)' : 'inherit' }
                    }}
                  />
                </ListItemButton>
              )
            ))}
          </>
        )}

        {/* Settings Section */}
        {settingsMenuItems.some(item => item.roles.includes(auth?.role)) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="textSecondary" sx={{ px: 3, py: 1 }}>
              Settings
            </Typography>
            {settingsMenuItems.map((item) => (
              item.roles.includes(auth?.role) && (
                <ListItemButton
                  key={item.text}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  selected={location.pathname === item.path}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    secondary={auth.role === 'super_admin' ? item.description : null}
                    secondaryTypographyProps={{
                      sx: { color: location.pathname === item.path ? 'rgba(255,255,255,0.7)' : 'inherit' }
                    }}
                  />
                </ListItemButton>
              )
            ))}
          </>
        )}

        {/* Admin Section */}
        {auth.role === 'super_admin' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="textSecondary" sx={{ px: 3, py: 1 }}>
              Administration
            </Typography>
            {adminMenuItems.map((item) => (
              <ListItemButton
                key={item.text}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                selected={location.pathname === item.path}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  secondary={item.description}
                  secondaryTypographyProps={{
                    sx: { color: location.pathname === item.path ? 'rgba(255,255,255,0.7)' : 'inherit' }
                  }}
                />
              </ListItemButton>
            ))}
          </>
        )}
      </List>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          Logged in as:
        </Typography>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {auth.username}
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
          Role: {auth.role}
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {location.pathname === '/dashboard' ? 'Dashboard' :
             location.pathname === '/tickets' ? 'Tickets' :
             location.pathname === '/tasks' ? 'Tasks' :
             location.pathname === '/rooms' ? 'Rooms' :
             location.pathname === '/admin/properties' ? 'Manage Properties' :
             location.pathname === '/admin/users' ? 'Manage Users' :
             location.pathname === '/settings/property' ? 'Property Theme' :
             location.pathname === '/settings/system' ? 'System Settings' :
             'Property Management System'}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // Height of AppBar
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;