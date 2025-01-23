import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import { Box, Typography, Grid, Paper, List, ListItem, ListItemText, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Alert, CircularProgress } from '@mui/material';

const PropertyStatistics = () => {
  const { auth } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('week'); // week, month, year

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let endpoint = '/statistics';
        if (auth.role === 'manager') {
          endpoint = `/properties/${auth.managedPropertyId}/statistics`;
        }
        
        const response = await apiClient.get(`${endpoint}?range=${dateRange}`);
        setStats(response.data);
      } catch (error) {
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [auth, dateRange]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Property Statistics</Typography>
      
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={dateRange}
          exclusive
          onChange={(e, value) => value && setDateRange(value)}
        >
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="year">Year</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {stats && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Tickets</Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Open Tickets" 
                    secondary={stats.tickets.open} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Completed Tickets" 
                    secondary={stats.tickets.completed} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Average Resolution Time" 
                    secondary={`${stats.tickets.avgResolutionTime} hours`} 
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Tasks</Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Active Tasks" 
                    secondary={stats.tasks.active} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Completed Tasks" 
                    secondary={stats.tasks.completed} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Task Completion Rate" 
                    secondary={`${stats.tasks.completionRate}%`} 
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Categories</Typography>
              <List>
                {Object.entries(stats.categories).map(([category, count]) => (
                  <ListItem key={category}>
                    <ListItemText 
                      primary={category} 
                      secondary={count} 
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default PropertyStatistics; 