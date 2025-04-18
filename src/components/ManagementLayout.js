import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Button, 
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const drawerWidth = 240;

const ManagementLayout = ({ isSystemConsole = false }) => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Management console menu items
  const managementMenuItems = [
    {
      text: 'Properties',
      icon: <BusinessIcon />,
      path: '/manage/properties',
      roles: ['manager', 'general_manager', 'super_admin']
    },
    {
      text: 'Users',
      icon: <PeopleIcon />,
      path: '/manage/users',
      roles: ['general_manager', 'super_admin']
    }
  ];

  // System console menu items
  const systemMenuItems = [
    {
      text: 'System Settings',
      icon: <SettingsIcon />,
      path: '/system/system-settings',
      roles: ['super_admin']
    },
    {
      text: 'History',
      icon: <HistoryIcon />,
      path: '/system/history',
      roles: ['super_admin']
    },
    {
      text: 'Email Settings',
      icon: <EmailIcon />,
      path: '/system/email-settings',
      roles: ['super_admin']
    },
    {
      text: 'SMS Settings',
      icon: <SmsIcon />,
      path: '/system/sms-settings',
      roles: ['super_admin']
    },
    {
      text: 'Attachment Settings',
      icon: <AttachFileIcon />,
      path: '/system/attachment-settings',
      roles: ['super_admin']
    }
  ];

  const menuItems = isSystemConsole ? systemMenuItems : managementMenuItems;
  const consoleName = isSystemConsole ? "System Console" : "Management Console";

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" component="div">
          {consoleName}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          (item.roles.includes(auth.user.role)) && (
            <ListItem 
              button 
              key={item.text} 
              component={RouterLink} 
              to={item.path}
              onClick={() => isMobile && setMobileOpen(false)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          )
        ))}
      </List>
      <Divider />
      <List>
        {auth.user.role === 'super_admin' && !isSystemConsole && (
          <ListItem button component={RouterLink} to="/system" onClick={() => isMobile && setMobileOpen(false)}>
            <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
            <ListItemText primary="System Console" />
          </ListItem>
        )}
        {isSystemConsole && (
          <ListItem button component={RouterLink} to="/manage" onClick={() => isMobile && setMobileOpen(false)}>
            <ListItemIcon><BusinessIcon /></ListItemIcon>
            <ListItemText primary="Management Console" />
          </ListItem>
        )}
        <ListItem button component={RouterLink} to="/home" onClick={() => isMobile && setMobileOpen(false)}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Back to Main App" />
        </ListItem>
      </List>
    </div>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: isSystemConsole ? 'primary.dark' : 'primary.main' 
      }}>
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
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {consoleName}
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
          ModalProps={{ keepMounted: true }}
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
          mt: { xs: 8, md: 8 } 
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default ManagementLayout; 