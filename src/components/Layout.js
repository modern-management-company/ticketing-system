import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  useTheme,
  useMediaQuery,
  CssBaseline,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ConfirmationNumber as TicketsIcon,
  Assignment as TasksIcon,
  MeetingRoom as RoomIcon,
  Business as PropertyIcon,
  People as UsersIcon,
  Settings as SettingsIcon,
  Palette as ThemeIcon,
  Logout as LogoutIcon,
  Assessment as ReportIcon,
  Home as HomeIcon,
  Email as EmailIcon,
  CleaningServices as HousekeepingIcon,
  History as HistoryIcon,
  Sms as SmsIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

const Layout = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (!auth?.isAuthenticated || !auth?.token) {
      navigate('/login');
    }
  }, [auth, navigate]);

  if (!auth?.isAuthenticated || !auth?.token) {
    return null;
  }

  // Define menu items based on user role
  const getMenuItems = () => {
    const baseItems = [
      {
        text: 'Home',
        icon: <HomeIcon />,
        path: '/home',
      },
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
      },
      {
        text: 'Tickets',
        icon: <TicketsIcon />,
        path: '/tickets',
      },
      {
        text: 'Tasks',
        icon: <TasksIcon />,
        path: '/tasks',
      },
      {
        text: 'Requests',
        icon: <HousekeepingIcon />,
        path: '/requests',
      },
    ];

    const managerItems = [
      {
        text: 'Rooms',
        icon: <RoomIcon />,
        path: '/rooms',
      },
      {
        text: 'Reports',
        icon: <ReportIcon />,
        path: '/reports',
      }
    ];

    // Add management console link for managers and super_admins
    if (auth.user.role === 'manager' || auth.user.role === 'super_admin') {
      managerItems.push({
        text: 'Management Console',
        icon: <SettingsIcon />,
        path: '/manage',
        description: 'Access management features'
      });
    }

    return auth.user.role === 'user' ? baseItems : [...baseItems, ...managerItems];
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap>
          {auth.user.role === 'super_admin' ? 'Admin Panel' :
           auth.user.role === 'manager' ? 'Manager Panel' : 'User Panel'}
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {getMenuItems().map((item) => (
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
                sx: { 
                  color: location.pathname === item.path ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                  fontSize: '0.75rem'
                }
              }}
            />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Logged in as: {auth.user.username}
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
          Role: {auth.user.role}
        </Typography>
        {auth.user.group && (
          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            Group: {auth.user.group}
          </Typography>
        )}
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          startIcon={<LogoutIcon />}
          onClick={() => {
            logout();
            navigate('/login');
          }}
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
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {(() => {
              const path = location.pathname.split('/');
              if (path[1] === 'home') return 'Home';
              if (path[1] === 'dashboard') return 'Dashboard';
              if (path[1] === 'tickets') return path.length > 2 ? `Ticket Details` : 'Tickets';
              if (path[1] === 'tasks') return path.length > 2 ? `Task Details` : 'Tasks';
              if (path[1] === 'rooms') return 'Rooms';
              if (path[1] === 'requests') return 'Service Requests';
              if (path[1] === 'reports') return 'Reports';
              
              return path[1].charAt(0).toUpperCase() + path[1].slice(1);
            })()}
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
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth },
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
          mt: '64px',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
