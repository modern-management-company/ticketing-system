import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  Button,
  Grid,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import apiClient from './apiClient';

const SecuritySettings = ({ onError, onSuccess }) => {
  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    passwordExpiration: 90,
    minPasswordLength: 8,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    ipRestriction: false,
    allowedIPs: '',
    logLevel: 'warning'
  });
  
  const [loading, setLoading] = useState(false);

  // Fetch settings from API
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/settings/security');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch security settings:', error);
      if (onError) onError('Failed to load security settings');
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

  const handleSliderChange = (name) => (event, newValue) => {
    setSettings({
      ...settings,
      [name]: newValue
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      const response = await apiClient.post('/api/settings/security', settings);
      setSettings(response.data);
      if (onSuccess) onSuccess('Security settings updated successfully');
    } catch (error) {
      console.error('Failed to save security settings:', error);
      if (onError) onError(error.response?.data?.message || 'Failed to save security settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Security Settings
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Authentication
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.twoFactorAuth}
                    onChange={handleChange}
                    name="twoFactorAuth"
                    color="primary"
                  />
                }
                label="Enable Two-Factor Authentication"
                sx={{ mb: 2, display: 'block' }}
              />

              <Typography gutterBottom>
                Minimum Password Length: {settings.minPasswordLength} characters
              </Typography>
              <Slider
                value={settings.minPasswordLength}
                onChange={handleSliderChange('minPasswordLength')}
                aria-labelledby="min-password-length-slider"
                valueLabelDisplay="auto"
                step={1}
                marks
                min={6}
                max={16}
                sx={{ mb: 3 }}
              />

              <Typography gutterBottom>
                Password Expiration: {settings.passwordExpiration} days
              </Typography>
              <Slider
                value={settings.passwordExpiration}
                onChange={handleSliderChange('passwordExpiration')}
                aria-labelledby="password-expiration-slider"
                valueLabelDisplay="auto"
                step={30}
                marks
                min={0}
                max={180}
                sx={{ mb: 3 }}
              />

              <Typography gutterBottom>
                Maximum Failed Login Attempts: {settings.maxLoginAttempts}
              </Typography>
              <Slider
                value={settings.maxLoginAttempts}
                onChange={handleSliderChange('maxLoginAttempts')}
                aria-labelledby="max-login-attempts-slider"
                valueLabelDisplay="auto"
                step={1}
                marks
                min={3}
                max={10}
                sx={{ mb: 2 }}
              />

              {settings.maxLoginAttempts < 5 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Setting a low number of login attempts may increase support requests.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Session Management
              </Typography>

              <Typography gutterBottom>
                Session Timeout: {settings.sessionTimeout} minutes
              </Typography>
              <Slider
                value={settings.sessionTimeout}
                onChange={handleSliderChange('sessionTimeout')}
                aria-labelledby="session-timeout-slider"
                valueLabelDisplay="auto"
                step={5}
                marks
                min={5}
                max={60}
                sx={{ mb: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                IP Restrictions
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.ipRestriction}
                    onChange={handleChange}
                    name="ipRestriction"
                    color="primary"
                  />
                }
                label="Enable IP Restrictions"
                sx={{ mb: 2, display: 'block' }}
              />

              {settings.ipRestriction && (
                <TextField
                  label="Allowed IP Addresses"
                  name="allowedIPs"
                  value={settings.allowedIPs}
                  onChange={handleChange}
                  helperText="Enter comma-separated IP addresses or ranges (e.g., 192.168.1.1, 10.0.0.0/24)"
                  fullWidth
                  margin="normal"
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Logging
              </Typography>

              <FormControl fullWidth margin="normal">
                <InputLabel id="log-level-label">Log Level</InputLabel>
                <Select
                  labelId="log-level-label"
                  id="logLevel"
                  name="logLevel"
                  value={settings.logLevel}
                  label="Log Level"
                  onChange={handleChange}
                >
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="debug">Debug</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
        >
          Save Security Settings
        </Button>
      </Box>
    </Box>
  );
};

export default SecuritySettings; 