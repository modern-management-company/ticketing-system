import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import apiClient from "./apiClient";
import {
  Typography,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper
} from "@mui/material";
import {
  Assignment as TaskIcon,
  ConfirmationNumber as TicketIcon,
  CheckCircle as CompletedIcon,
  Pending as PendingIcon,
  HourglassEmpty as InProgressIcon,
  ArrowForward as ArrowForwardIcon,
  Business as PropertyIcon,
  People as PeopleIcon,
  Assessment as ReportIcon,
  MeetingRoom as RoomIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const HomeOverview = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState({
    recentTickets: [],
    recentTasks: [],
    stats: {
      openTickets: 0,
      activeTasks: 0,
      openRequests: 0,
      totalTasks: 0,
      ticketResolutionRate: 0,
      totalProperties: 0,
      totalUsers: 0,
      totalRooms: 0,
      ticketDistribution: [],
      priorityDistribution: []
    }
  });

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/dashboard/stats');
      
      setOverview({
        recentTickets: response.data.recentTickets || [],
        recentTasks: response.data.recentTasks || [],
        stats: {
          openTickets: response.data.openTickets || 0,
          activeTasks: response.data.activeTasks || 0,
          openRequests: response.data.openRequests || 0,
          totalTasks: response.data.totalTasks || 0,
          ticketResolutionRate: response.data.resolutionRate || 0,
          totalProperties: response.data.totalProperties || 0,
          totalUsers: response.data.totalUsers || 0,
          totalRooms: response.data.totalRooms || 0,
          ticketDistribution: response.data.ticketDistribution || [],
          priorityDistribution: response.data.priorityDistribution || []
        }
      });
    } catch (error) {
      console.error('Failed to fetch overview data:', error);
      setError('Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CompletedIcon color="success" />;
      case 'in progress':
        return <InProgressIcon color="warning" />;
      default:
        return <PendingIcon color="error" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in progress':
        return 'warning';
      default:
        return 'error';
    }
  };

  const getRoleSpecificWelcome = () => {
    switch (auth?.user?.role) {
      case 'super_admin':
        return {
          title: 'System Administrator Dashboard',
          subtitle: 'Manage your entire property management system',
          description: 'Monitor system performance, manage users, and oversee all properties.'
        };
      case 'manager':
        return {
          title: 'Property Manager Dashboard',
          subtitle: 'Manage your assigned properties',
          description: 'Track maintenance tasks, handle tickets, and manage room status.'
        };
      default:
        return {
          title: 'User Dashboard',
          subtitle: 'Track your tickets and tasks',
          description: 'View and manage your assigned work items.'
        };
    }
  };

  const getRoleSpecificStats = () => {
    const baseStats = [
      {
        title: 'Open Tickets',
        value: overview.stats.openTickets,
        icon: <TicketIcon color="primary" />,
        action: () => navigate('/tickets')
      },
      {
        title: 'Active Tasks',
        value: overview.stats.activeTasks,
        icon: <TaskIcon color="primary" />,
        action: () => navigate('/tasks')
      },
      {
        title: 'Open Requests',
        value: overview.stats.openRequests || 0,
        icon: <PendingIcon color="primary" />,
        action: () => navigate('/requests')
      }
    ];

    if (auth?.user?.role === 'super_admin') {
      return [
        ...baseStats,
        {
          title: 'Total Properties',
          value: overview.stats.totalProperties,
          icon: <PropertyIcon color="primary" />,
          action: () => navigate('/admin/properties')
        },
        {
          title: 'Total Users',
          value: overview.stats.totalUsers,
          icon: <PeopleIcon color="primary" />,
          action: () => navigate('/admin/users')
        },
        {
          title: 'Total Rooms',
          value: overview.stats.totalRooms,
          icon: <RoomIcon color="primary" />,
          action: () => navigate('/rooms')
        }
      ];
    }

    if (auth?.user?.role === 'manager') {
      return [
        ...baseStats,
        {
          title: 'Total Properties',
          value: overview.stats.totalProperties,
          icon: <PropertyIcon color="primary" />,
          action: () => navigate('/properties')
        },
        {
          title: 'Total Rooms',
          value: overview.stats.totalRooms,
          icon: <RoomIcon color="primary" />,
          action: () => navigate('/rooms')
        },
        {
          title: 'Team Members',
          value: overview.stats.totalUsers,
          icon: <PeopleIcon color="primary" />,
          action: () => navigate('/team')
        }
      ];
    }

    // For regular users
    return [
      ...baseStats,
      {
        title: 'Resolution Rate',
        value: `${overview.stats.ticketResolutionRate}%`,
        icon: <ReportIcon color="primary" />,
        action: () => navigate('/reports')
      }
    ];
  };

  const getRoleSpecificActions = () => {
    const baseActions = [
      {
        title: 'Create Ticket',
        icon: <TicketIcon />,
        action: () => navigate('/tickets'),
        variant: 'contained'
      },
      {
        title: 'Create Task',
        icon: <TaskIcon />,
        action: () => navigate('/tasks'),
        variant: 'contained'
      },
      {
        title: 'Create Request',
        icon: <PendingIcon />,
        action: () => navigate('/requests'),
        variant: 'contained'
      }
    ];

    if (auth?.user?.role === 'super_admin') {
      return [
        ...baseActions,
        {
          title: 'Manage Users',
          icon: <PeopleIcon />,
          action: () => navigate('/admin/users'),
          variant: 'outlined'
        },
        {
          title: 'Manage Properties',
          icon: <PropertyIcon />,
          action: () => navigate('/admin/properties'),
          variant: 'outlined'
        },
        {
          title: 'View Reports',
          icon: <ReportIcon />,
          action: () => navigate('/reports'),
          variant: 'outlined'
        }
      ];
    }

    if (auth?.user?.role === 'manager') {
      return [
        ...baseActions,
        {
          title: 'Manage Rooms',
          icon: <RoomIcon />,
          action: () => navigate('/rooms'),
          variant: 'outlined'
        },
        {
          title: 'View Reports',
          icon: <ReportIcon />,
          action: () => navigate('/reports'),
          variant: 'outlined'
        }
      ];
    }

    return baseActions;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const welcome = getRoleSpecificWelcome();

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Welcome Section */}
      <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)' }}>
        <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
          {welcome.title}
        </Typography>
        <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          Welcome back, {auth?.user?.username}!
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          {welcome.description}
        </Typography>
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {getRoleSpecificStats().map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                cursor: stat.action ? 'pointer' : 'default',
                '&:hover': stat.action ? { transform: 'translateY(-4px)', boxShadow: 3 } : {},
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onClick={stat.action}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {stat.icon}
                  <Typography color="text.secondary" sx={{ ml: 1 }}>
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h4" component="div">
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                {getRoleSpecificActions().map((action, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Button
                      variant={action.variant}
                      fullWidth
                      startIcon={action.icon}
                      onClick={action.action}
                      sx={{ py: 1 }}
                    >
                      {action.title}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


    </Container>
  );
};

export default HomeOverview;
