import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Paper
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import apiClient from '../apiClient';

const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'Property Management System',
    maintenanceMode: false,
    userRegistration: true,
    maxFileSize: 16,
    sessionTimeout: 60,
    defaultLanguage: 'en',
    emailNotifications: true,
    backupFrequency: 24,
  });

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/settings/system');
      setSettings(response.data);
    } catch (error) {
      setError('Failed to load system settings');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.post('/settings/system', settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Failed to save system settings');
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    fetchSystemSettings();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" component="h2">
              System Settings
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={loading}
              >
                Save Changes
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              System settings saved successfully!
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* General Settings */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>General Settings</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Site Name"
                      value={settings.siteName}
                      onChange={(e) => handleChange('siteName', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Default Language"
                      value={settings.defaultLanguage}
                      onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Security Settings */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Security Settings</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Session Timeout (minutes)"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max File Size (MB)"
                      value={settings.maxFileSize}
                      onChange={(e) => handleChange('maxFileSize', parseInt(e.target.value))}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* System Controls */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>System Controls</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.maintenanceMode}
                          onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                        />
                      }
                      label="Maintenance Mode"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.userRegistration}
                          onChange={(e) => handleChange('userRegistration', e.target.checked)}
                        />
                      }
                      label="Allow User Registration"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.emailNotifications}
                          onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                        />
                      }
                      label="Email Notifications"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Backup Frequency (hours)"
                      value={settings.backupFrequency}
                      onChange={(e) => handleChange('backupFrequency', parseInt(e.target.value))}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemSettings; 