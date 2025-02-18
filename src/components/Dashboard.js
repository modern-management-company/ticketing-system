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
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
import PropertySwitcher from './PropertySwitcher';

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
  const [selectedProperty, setSelectedProperty] = useState('all');

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
      setLoading(true);
      await apiClient.get('/verify-token');
      
      // Get data for selected property or all properties
      const propertiesRes = await apiClient.get('/properties');
      const properties = propertiesRes.data || [];
      
      // Initialize arrays for tickets and tasks
      let allTickets = [];
      let allTasks = [];
      let roomsData = {};
      
      // Fetch data for selected property or all properties
      const propertiesToFetch = selectedProperty === 'all' 
        ? properties.filter(p => p.status === 'active')
        : properties.filter(p => p.property_id === selectedProperty && p.status === 'active');

      // Fetch data for each property
      for (const property of propertiesToFetch) {
        try {
          const [ticketsRes, tasksRes, roomsRes, managersRes] = await Promise.all([
            apiClient.get(`/properties/${property.property_id}/tickets`),
            apiClient.get(`/properties/${property.property_id}/tasks`),
            apiClient.get(`/properties/${property.property_id}/rooms`),
            apiClient.get(`/properties/${property.property_id}/managers`)
          ]);
          
          // Filter tickets based on user role
          let propertyTickets = ticketsRes.data?.tickets || [];
          if (auth.role === 'user') {
            propertyTickets = propertyTickets.filter(ticket => ticket.created_by_id === auth.user_id);
          }
          
          // Add property information to tickets and tasks
          if (propertyTickets.length > 0) {
            propertyTickets = propertyTickets.map(ticket => ({
              ...ticket,
              property_id: property.property_id,
              property_name: property.name
            }));
            allTickets = [...allTickets, ...propertyTickets];
          }
          
          if (tasksRes.data?.tasks) {
            const propertyTasks = tasksRes.data.tasks.map(task => ({
              ...task,
              property_id: property.property_id,
              property_name: property.name
            }));
            allTasks = [...allTasks, ...propertyTasks];
          }
          
          roomsData[property.property_id] = roomsRes.data?.rooms || [];
          
          // Add managers to property data
          property.managers = managersRes.data?.managers || [];
        } catch (error) {
          console.error(`Error fetching data for property ${property.name}:`, error);
        }
      }

      setDashboardData({
        tickets: allTickets,
        tasks: allTasks,
        properties: propertiesToFetch,
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
  }, [auth?.token, auth?.role, auth?.user_id, selectedProperty, logout, navigate]);

  useEffect(() => {
    verifyAuthAndFetchData();
  }, [verifyAuthAndFetchData]);

  const getFilteredData = useCallback(() => {
    let filteredTickets = [...dashboardData.tickets];
    let filteredTasks = [...dashboardData.tasks];

    // Filter by selected property if not 'all'
    if (selectedProperty !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.property_id === selectedProperty);
      filteredTasks = filteredTasks.filter(task => task.property_id === selectedProperty);
    }

    return { filteredTickets, filteredTasks };
  }, [dashboardData, selectedProperty]);

  const getTicketStatusData = () => {
    const { filteredTickets } = getFilteredData();
    console.log('Generating ticket status data with tickets:', filteredTickets);
    
    const statusCounts = {
      open: filteredTickets.filter(t => t.status?.toLowerCase() === 'open').length || 0,
      inProgress: filteredTickets.filter(t => t.status?.toLowerCase() === 'in progress').length || 0,
      completed: filteredTickets.filter(t => t.status?.toLowerCase() === 'completed').length || 0
    };

    console.log('Ticket status counts:', statusCounts);

    return {
      labels: ['Open', 'In Progress', 'Completed'],
      datasets: [{
        label: 'Tickets by Status',
        data: [statusCounts.open, statusCounts.inProgress, statusCounts.completed],
        backgroundColor: ['#ff6384', '#ffcd56', '#4bc0c0'],
        borderColor: ['#ff6384', '#ffcd56', '#4bc0c0'],
        borderWidth: 1
      }]
    };
  };

  const getTaskStatusData = () => {
    const { filteredTasks } = getFilteredData();
    console.log('Generating task status data with tasks:', filteredTasks);
    
    const statusCounts = {
      pending: filteredTasks.filter(t => t.status?.toLowerCase() === 'pending').length || 0,
      inProgress: filteredTasks.filter(t => t.status?.toLowerCase() === 'in progress').length || 0,
      completed: filteredTasks.filter(t => t.status?.toLowerCase() === 'completed').length || 0
    };

    console.log('Task status counts:', statusCounts);

    return {
      labels: ['Pending', 'In Progress', 'Completed'],
      datasets: [{
        label: 'Tasks by Status',
        data: [statusCounts.pending, statusCounts.inProgress, statusCounts.completed],
        backgroundColor: ['#ff9f40', '#36a2eb', '#4bc0c0'],
        borderColor: ['#ff9f40', '#36a2eb', '#4bc0c0'],
        borderWidth: 1
      }]
    };
  };

  const getPropertyData = () => {
    const { filteredTickets, filteredTasks } = getFilteredData();
    console.log('Generating property data with:', {
      properties: dashboardData.properties,
      tasks: filteredTasks,
      tickets: filteredTickets
    });

    const propertyData = dashboardData.properties
      .filter(property => selectedProperty === 'all' || property.property_id === selectedProperty)
      .map(property => {
        const propertyTickets = filteredTickets.filter(t => t.property_id === property.property_id).length || 0;
        const propertyTasks = filteredTasks.filter(t => t.property_id === property.property_id).length || 0;
        
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
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        },
        {
          label: 'Tasks',
          data: propertyData.map(p => p.tasks),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
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
      {/* Property Filter */}
      <Box sx={{ mb: 3 }}>
        <PropertySwitcher onPropertyChange={setSelectedProperty} />
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Tickets Overview" />
            <CardContent>
              <Box sx={{ height: 300, position: 'relative' }}>
                {dashboardData.tickets.length > 0 ? (
                  <Doughnut 
                    data={getTicketStatusData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          display: true
                        }
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body1" align="center" sx={{ pt: 8 }}>
                    No ticket data available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Tasks Overview" />
            <CardContent>
              <Box sx={{ height: 300, position: 'relative' }}>
                {dashboardData.tasks.length > 0 ? (
                  <Doughnut 
                    data={getTaskStatusData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          display: true
                        }
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body1" align="center" sx={{ pt: 8 }}>
                    No task data available
                  </Typography>
                )}
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
              <Box sx={{ height: 400, position: 'relative' }}>
                {dashboardData.properties.length > 0 ? (
                  <Bar
                    data={getPropertyData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                          display: true
                        }
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body1" align="center" sx={{ pt: 8 }}>
                    No property data available
                  </Typography>
                )}
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