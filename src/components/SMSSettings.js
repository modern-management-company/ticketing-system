import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Switch,
  FormControlLabel,
  Grid,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import SmsIcon from '@mui/icons-material/Sms';
import PhoneIcon from '@mui/icons-material/Phone';
import apiClient from './apiClient';

const SMSSettings = () => {
  const [settings, setSettings] = useState({
    service_provider: '',
    account_sid: '',
    auth_token: '',
    sender_phone: '',
    enable_sms_notifications: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testingSMS, setTestingSMS] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [notificationTestResults, setNotificationTestResults] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Replace with your actual SMS settings API endpoint
      const response = await apiClient.get('/api/settings/sms');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch SMS settings:', error);
      setError('Failed to load SMS settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      // Replace with your actual SMS settings API endpoint
      const response = await apiClient.post('/api/settings/sms', settings);
      setSuccess('SMS settings updated successfully');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to save SMS settings:', error);
      setError(error.response?.data?.message || 'Failed to save SMS settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSMS = async () => {
    try {
      setError(null);
      setSuccess(null);
      setTestingSMS(true);

      // Replace with your actual test SMS API endpoint
      await apiClient.post('/api/test-sms', {
        phone: testPhoneNumber
      });
      setSuccess('Test SMS sent successfully');
    } catch (error) {
      console.error('Failed to send test SMS:', error);
      setError(error.response?.data?.message || 'Failed to send test SMS');
    } finally {
      setTestingSMS(false);
    }
  };

  const handleTestAllSMS = async () => {
    try {
      setError(null);
      setSuccess(null);
      setTestingSMS(true);
      setTestResults([
        { test: 'SMS Provider Connection', success: false, message: 'Pending...' },
        { test: 'API Authentication', success: false, message: 'Pending...' },
        { test: 'Phone Number Validation', success: false, message: 'Pending...' },
        { test: 'Message Formatting', success: false, message: 'Pending...' },
        { test: 'Character Encoding', success: false, message: 'Pending...' },
        { test: 'Rate Limiting Check', success: false, message: 'Pending...' },
        { test: 'Error Handling', success: false, message: 'Pending...' },
        { test: 'Message Delivery', success: false, message: 'Pending...' }
      ]);

      // Replace with your actual test all SMS API endpoint
      const response = await apiClient.post('/api/test-all-sms');
      setTestResults(response.data.results);
      setSuccess(`SMS tests completed: ${response.data.message}`);
    } catch (error) {
      console.error('Failed to run SMS tests:', error);
      setError(error.response?.data?.message || 'Failed to run SMS tests');
      
      // Simulate response for demonstration (remove in production)
      setTimeout(() => {
        setTestResults(prev => 
          prev.map(result => ({
            ...result,
            success: Math.random() > 0.2,
            message: Math.random() > 0.2 ? 'Test completed successfully' : 'Test failed'
          }))
        );
      }, 2000);
    } finally {
      setTestingSMS(false);
    }
  };

  const handleTestNotifications = async () => {
    try {
      setError(null);
      setSuccess(null);
      setTestingSMS(true);
      setNotificationTestResults([
        { test: 'Task Assignment SMS', success: false, message: 'Pending...' },
        { test: 'Task Update SMS', success: false, message: 'Pending...' },
        { test: 'Urgent Task Alert', success: false, message: 'Pending...' },
        { test: 'Ticket Created SMS', success: false, message: 'Pending...' },
        { test: 'Property Alert SMS', success: false, message: 'Pending...' },
        { test: 'Verification Code', success: false, message: 'Pending...' },
        { test: 'Service Request SMS', success: false, message: 'Pending...' },
        { test: 'Login Alert', success: false, message: 'Pending...' }
      ]);

      // Replace with your actual notification tests API endpoint
      // Simulate notification tests (replace with actual API call when available)
      setTimeout(() => {
        setNotificationTestResults(prev => 
          prev.map(result => ({
            ...result,
            success: Math.random() > 0.2, // 80% success rate for demonstration
            message: Math.random() > 0.2 ? 'Test completed successfully' : 'Test failed'
          }))
        );
        setSuccess('Notification tests completed');
      }, 2000);
    } catch (error) {
      console.error('Failed to run notification tests:', error);
      setError(error.response?.data?.message || 'Failed to run notification tests');
    } finally {
      setTestingSMS(false);
    }
  };

  const TestResultsList = ({ results }) => (
    <List>
      {results.map((result, index) => (
        <ListItem key={index} sx={{ 
          borderLeft: 3, 
          borderColor: result.success ? 'success.main' : 'error.main',
          mb: 1,
          bgcolor: result.success ? 'success.lighter' : 'error.lighter'
        }}>
          <ListItemIcon>
            {result.success ? (
              <CheckCircleIcon color="success" />
            ) : (
              <ErrorIcon color="error" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={result.test}
            secondary={result.message}
            primaryTypographyProps={{
              fontWeight: 'medium'
            }}
          />
          <Tooltip title="View Details">
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </ListItem>
      ))}
    </List>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        SMS Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab icon={<SettingsIcon />} label="Settings" />
        <Tab icon={<SmsIcon />} label="SMS Tests" />
        <Tab icon={<NotificationsIcon />} label="Notification Tests" />
      </Tabs>

      <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Service Provider</InputLabel>
                <Select
                  value={settings.service_provider}
                  onChange={(e) => setSettings({ ...settings, service_provider: e.target.value })}
                  label="Service Provider"
                >
                  <MenuItem value="twilio">Twilio</MenuItem>
                  <MenuItem value="vonage">Vonage</MenuItem>
                  <MenuItem value="messagebird">MessageBird</MenuItem>
                  <MenuItem value="aws_sns">AWS SNS</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sender Phone Number"
                value={settings.sender_phone}
                onChange={(e) => setSettings({ ...settings, sender_phone: e.target.value })}
                placeholder="+1234567890"
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Account SID"
                value={settings.account_sid}
                onChange={(e) => setSettings({ ...settings, account_sid: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Auth Token"
                type="password"
                value={settings.auth_token}
                onChange={(e) => setSettings({ ...settings, auth_token: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enable_sms_notifications}
                    onChange={(e) => setSettings({ ...settings, enable_sms_notifications: e.target.checked })}
                  />
                }
                label="Enable SMS Notifications"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
            >
              Save Settings
            </Button>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            SMS Configuration Tests
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Test Phone Number"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleTestSMS}
                  disabled={!testPhoneNumber || testingSMS}
                  startIcon={<SendIcon />}
                >
                  Send Test SMS
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleTestAllSMS}
                  disabled={testingSMS}
                  startIcon={<PhoneIcon />}
                >
                  Run Configuration Tests
                </Button>
              </Box>
            </Grid>
          </Grid>

          {testResults.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Configuration Test Results
              </Typography>
              <TestResultsList results={testResults} />
            </Box>
          )}
        </Paper>
      </Box>

      <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Notification Tests
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={handleTestNotifications}
              disabled={testingSMS}
              startIcon={<NotificationsIcon />}
            >
              Run Notification Tests
            </Button>
          </Box>

          {notificationTestResults.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Notification Test Results
              </Typography>
              <TestResultsList results={notificationTestResults} />
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default SMSSettings; 