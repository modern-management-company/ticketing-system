import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from "../components/apiClient";
import { Box, Card, CardContent, Grid, Typography, CardHeader, CircularProgress, Alert } from '@mui/material';

const Dashboard = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    tickets: [],
    tasks: [],
    properties: [],
    reportData: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const verifyAuthAndFetchData = useCallback(async () => {
    if (!auth?.token) {
      setError('Authentication required');
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      // Verify token first
      await apiClient.get('/verify-token');
      
      // Then fetch dashboard data
      const [ticketsRes, tasksRes, propertiesRes, reportRes] = await Promise.all([
        apiClient.get('/tickets'),
        apiClient.get('/tasks'),
        apiClient.get('/properties'),
        apiClient.get('/reports/tickets')
      ]);

      setDashboardData({
        tickets: ticketsRes.data?.tickets || [],
        tasks: tasksRes.data?.tasks || [],
        properties: propertiesRes.data?.properties || [],
        reportData: reportRes.data
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
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Tickets Overview" />
            <CardContent>
              <Typography variant="h6">Total Tickets: {dashboardData.tickets.length}</Typography>
              <Typography>
                Open: {dashboardData.tickets.filter(t => t.status === 'Open').length}
              </Typography>
              <Typography>
                In Progress: {dashboardData.tickets.filter(t => t.status === 'In Progress').length}
              </Typography>
              <Typography>
                Completed: {dashboardData.tickets.filter(t => t.status === 'Completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Tasks Overview" />
            <CardContent>
              <Typography variant="h6">Total Tasks: {dashboardData.tasks.length}</Typography>
              <Typography>
                Pending: {dashboardData.tasks.filter(t => t.status === 'Pending').length}
              </Typography>
              <Typography>
                In Progress: {dashboardData.tasks.filter(t => t.status === 'In Progress').length}
              </Typography>
              <Typography>
                Completed: {dashboardData.tasks.filter(t => t.status === 'Completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Properties Overview" />
            <CardContent>
              <Typography variant="h6">Total Properties: {dashboardData.properties.length}</Typography>
              {dashboardData.properties.length > 0 && (
                <Typography>
                  Active Properties: {dashboardData.properties.filter(p => p.status === 'active').length}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 