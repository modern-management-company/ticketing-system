import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from "./apiClient"; 
import { Box, Card, CardContent, Grid, Typography, CardHeader } from '@mui/material';
import { CircularProgress, Alert } from '@mui/material';

const Dashboard = () => {
  const { auth } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [auth]);

  const fetchDashboardData = async () => {
    try {
      const [ticketsRes, tasksRes, propertiesRes, reportRes] = await Promise.all([
        apiClient.get('/tickets'),
        apiClient.get('/tasks'),
        apiClient.get('/properties'),
        apiClient.get('/reports/tickets')
      ]);

      setTickets(ticketsRes.data.tickets);
      setTasks(tasksRes.data.tasks);
      setProperties(propertiesRes.data.properties);
      setReportData(reportRes.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch dashboard data');
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Open Tickets</Typography>
              <Typography variant="h3">
                {tickets.filter(t => t.status === 'open').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Pending Tasks</Typography>
              <Typography variant="h3">
                {tasks.filter(t => t.status === 'Pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Active Properties</Typography>
              <Typography variant="h3">
                {properties.filter(p => p.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Reports Section */}
        {(auth.role === 'super_admin' || auth.role === 'manager') && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Ticket Reports" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6">Tickets by Status</Typography>
                    {/* Add chart or detailed breakdown */}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6">Tickets by Priority</Typography>
                    {/* Add chart or detailed breakdown */}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard; 