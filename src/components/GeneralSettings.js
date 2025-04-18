import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  FormControlLabel,
  Switch,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import apiClient from './apiClient';

const GeneralSettings = ({ onError, onSuccess }) => {
  const [settings, setSettings] = useState({
    systemName: 'Ticketing System',
    companyName: 'Demo Company',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    enableNotifications: true,
    maintenanceMode: false
  });
  
  const [loading, setLoading] = useState(false);

  // Fetch settings from API
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/settings/general');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch general settings:', error);
      if (onError) onError('Failed to load general settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    const newValue = event.target.type === 'checkbox' ? checked : value;
    
    setSettings({
      ...settings,
      [name]: newValue
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      const response = await apiClient.post('/api/settings/general', settings);
      setSettings(response.data);
      if (onSuccess) onSuccess('General settings updated successfully');
    } catch (error) {
      console.error('Failed to save general settings:', error);
      if (onError) onError(error.response?.data?.message || 'Failed to save general settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        General System Settings
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="System Name"
            name="systemName"
            value={settings.systemName}
            onChange={handleChange}
            margin="normal"
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Company Name"
            name="companyName"
            value={settings.companyName}
            onChange={handleChange}
            margin="normal"
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="timezone-label">Timezone</InputLabel>
            <Select
              labelId="timezone-label"
              id="timezone"
              name="timezone"
              value={settings.timezone}
              label="Timezone"
              onChange={handleChange}
            >
              <MenuItem value="UTC">UTC</MenuItem>
              <MenuItem value="EST">Eastern Time (EST)</MenuItem>
              <MenuItem value="CST">Central Time (CST)</MenuItem>
              <MenuItem value="MST">Mountain Time (MST)</MenuItem>
              <MenuItem value="PST">Pacific Time (PST)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="date-format-label">Date Format</InputLabel>
            <Select
              labelId="date-format-label"
              id="dateFormat"
              name="dateFormat"
              value={settings.dateFormat}
              label="Date Format"
              onChange={handleChange}
            >
              <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
              <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
              <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableNotifications}
                onChange={handleChange}
                name="enableNotifications"
                color="primary"
              />
            }
            label="Enable System Notifications"
            sx={{ mt: 2 }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.maintenanceMode}
                onChange={handleChange}
                name="maintenanceMode"
                color="warning"
              />
            }
            label="Maintenance Mode"
            sx={{ mt: 2 }}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default GeneralSettings; 