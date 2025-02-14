import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from "../components/apiClient";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CardHeader,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController
);

const Dashboard = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    tickets: [],
    tasks: [],
    properties: [],
    rooms: {},
    reportData: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoomsForProperty = async (propertyId) => {
    try {
      const response = await apiClient.get(`/properties/${propertyId}/rooms`);
      return response.data?.rooms || [];
    } catch (error) {
      console.error(`Failed to fetch rooms for property ${propertyId}:`, error);
      return [];
    }
  };

  const verifyAuthAndFetchData = useCallback(async () => {
    if (!auth?.token) {
      setError('Authentication required');
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      await apiClient.get('/verify-token');
      
      // Get properties first
      const propertiesRes = await apiClient.get('/properties');
      const properties = propertiesRes.data || [];
      
      // Initialize arrays for tickets and tasks
      let allTickets = [];
      let allTasks = [];
      let roomsData = {};
      
      // Fetch data for each property
      for (const property of properties) {
        const [ticketsRes, tasksRes, roomsRes] = await Promise.all([
          apiClient.get(`/properties/${property.property_id}/tickets`),
          apiClient.get(`/properties/${property.property_id}/tasks`),
          apiClient.get(`/properties/${property.property_id}/rooms`)
        ]);
        
        console.log(`Tasks for property ${property.name}:`, tasksRes.data);
        
        // Add property's tickets and tasks to the arrays
        if (ticketsRes.data?.tickets) {
          allTickets = [...allTickets, ...ticketsRes.data.tickets];
        }
        if (tasksRes.data?.tasks) {
          const propertyTasks = tasksRes.data.tasks.map(task => ({
            ...task,
            property_id: property.property_id // Ensure property_id is set
          }));
          allTasks = [...allTasks, ...propertyTasks];
        }
        roomsData[property.property_id] = roomsRes.data?.rooms || [];
      }

      console.log('All tasks:', allTasks);
      console.log('All tickets:', allTickets);

      setDashboardData({
        tickets: allTickets,
        tasks: allTasks,
        properties: properties,
        rooms: roomsData
      });
      setError(null);
    } catch (error) {
      console.error('Dashboard error:', error);
      if (error.response?.status === 401 || error.response?.status === 422) {
        setError('Session expired. Please login again.');
        logout();
        navigate('/login');
      } else {
        setError(error.response?.data?.msg || error.message || 'Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [auth?.token, logout, navigate]);

  useEffect(() => {
    verifyAuthAndFetchData();
  }, [verifyAuthAndFetchData]);

  const getTicketStatusData = () => {
    const statusCounts = {
      open: dashboardData.tickets.filter(t => t.status.toLowerCase() === 'open').length,
      inProgress: dashboardData.tickets.filter(t => t.status.toLowerCase() === 'in progress').length,
      completed: dashboardData.tickets.filter(t => t.status.toLowerCase() === 'completed').length
    };

    return {
      labels: ['Open', 'In Progress', 'Completed'],
      datasets: [{
        data: [statusCounts.open, statusCounts.inProgress, statusCounts.completed],
        backgroundColor: ['#ff6384', '#ffcd56', '#4bc0c0'],
        borderWidth: 1
      }]
    };
  };

  const getTaskStatusData = () => {
    const statusCounts = {
      pending: dashboardData.tasks.filter(t => t.status.toLowerCase() === 'pending').length,
      inProgress: dashboardData.tasks.filter(t => t.status.toLowerCase() === 'in progress').length,
      completed: dashboardData.tasks.filter(t => t.status.toLowerCase() === 'completed').length
    };

    return {
      labels: ['Pending', 'In Progress', 'Completed'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.inProgress, statusCounts.completed],
        backgroundColor: ['#ff9f40', '#36a2eb', '#4bc0c0'],
        borderWidth: 1
      }]
    };
  };

  const getPropertyData = () => {
    console.log('Generating property data with:', {
      properties: dashboardData.properties,
      tasks: dashboardData.tasks,
      tickets: dashboardData.tickets
    });

    const propertyData = dashboardData.properties.map(property => {
      const propertyTickets = dashboardData.tickets.filter(t => t.property_id === property.property_id).length;
      const propertyTasks = dashboardData.tasks.filter(t => t.property_id === property.property_id).length;
      
      console.log(`Property ${property.name} stats:`, {
        tickets: propertyTickets,
        tasks: propertyTasks
      });

      return {
        name: property.name,
        tickets: propertyTickets,
        tasks: propertyTasks
      };
    });

    return {
      labels: propertyData.map(p => p.name),
      datasets: [
        {
          label: 'Tickets',
          data: propertyData.map(p => p.tickets),
          backgroundColor: '#ff6384',
          borderColor: '#ff6384',
        },
        {
          label: 'Tasks',
          data: propertyData.map(p => p.tasks),
          backgroundColor: '#36a2eb',
          borderColor: '#36a2eb',
        }
      ]
    };
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
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Tickets Overview" />
            <CardContent>
              <Box sx={{ height: 200 }}>
                <Doughnut 
                  data={getTicketStatusData()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Tasks Overview" />
            <CardContent>
              <Box sx={{ height: 200 }}>
                <Doughnut 
                  data={getTaskStatusData()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Quick Stats" />
            <CardContent>
              <Typography variant="h3" align="center" color="primary">
                {dashboardData.properties.length}
              </Typography>
              <Typography variant="subtitle1" align="center" gutterBottom>
                Total Properties
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h3" align="center" color="secondary">
                {Object.values(dashboardData.rooms).reduce((total, rooms) => total + rooms.length, 0)}
              </Typography>
              <Typography variant="subtitle1" align="center">
                Total Rooms
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Property Performance Chart */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Property Performance Overview" />
            <CardContent>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={getPropertyData()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top'
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Properties List */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Properties Details" />
            <CardContent>
              <List>
                {dashboardData.properties.map((property) => {
                  const propertyRooms = dashboardData.rooms[property.property_id] || [];
                  const roomTypes = propertyRooms.reduce((acc, room) => {
                    acc[room.type || 'standard'] = (acc[room.type || 'standard'] || 0) + 1;
                    return acc;
                  }, {});

                  const propertyTasks = dashboardData.tasks.filter(t => 
                    t.property_id === property.property_id && 
                    t.status?.toLowerCase() !== 'completed'
                  );

                  const propertyTickets = dashboardData.tickets.filter(t => 
                    t.property_id === property.property_id && 
                    t.status?.toLowerCase() !== 'completed'
                  );

                  console.log(`Property ${property.name} active tasks:`, propertyTasks);

                  return (
                    <React.Fragment key={property.property_id}>
                      <ListItem>
                        <ListItemText
                          primary={property.name}
                          secondary={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                                Rooms Overview:
                              </Typography>
                              <Typography variant="body2">
                                Total Rooms: {propertyRooms.length}
                              </Typography>
                              {Object.entries(roomTypes).map(([type, count]) => (
                                <Typography key={type} variant="body2" sx={{ pl: 2 }}>
                                  • {type.charAt(0).toUpperCase() + type.slice(1)}: {count}
                                </Typography>
                              ))}
                              <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                                Activity Overview:
                              </Typography>
                              <Typography variant="body2">
                                Active Tickets: {propertyTickets.length}
                              </Typography>
                              <Typography variant="body2">
                                Active Tasks: {propertyTasks.length}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 