import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Switch, 
  FormControlLabel, 
  Card, 
  CardContent, 
  CardActions,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import apiClient from './apiClient';

const SMSSettings = () => {
  const [settings, setSettings] = useState({
    account_sid: '',
    auth_token: '',
    from_number: '',
    enable_sms_notifications: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/settings/sms');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch SMS settings:', error);
      setError('Failed to load SMS settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await apiClient.post('/api/settings/sms', settings);
      
      if (response.status === 200) {
        setSuccess('SMS settings updated successfully');
      }
    } catch (error) {
      console.error('Failed to save SMS settings:', error);
      setError('Failed to save SMS settings. Please check your input and try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestSMS = async () => {
    setTestDialogOpen(true);
  };

  const sendTestSMS = async () => {
    try {
      setTestLoading(true);
      setError(null);
      setTestResults(null);
      
      if (!testPhone) {
        setError('Phone number is required');
        setTestLoading(false);
        return;
      }
      
      const response = await apiClient.post('/api/test-sms', {
        phone_number: testPhone
      });
      
      setTestResults({
        success: response.data.success,
        message: response.data.msg
      });
    } catch (error) {
      console.error('Failed to send test SMS:', error);
      setTestResults({
        success: false,
        message: error.response?.data?.msg || 'Failed to send test SMS'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'enable_sms_notifications') {
      setSettings({ ...settings, [name]: checked });
    } else {
      setSettings({ ...settings, [name]: value });
    }
  };

  const TestResultAlert = ({ result }) => {
    if (!result) return null;
    
    return (
      <Alert 
        severity={result.success ? 'success' : 'error'}
        sx={{ mt: 2 }}
      >
        {result.message}
      </Alert>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        SMS Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure SMS settings for notifications. These settings are used for sending SMS notifications to users and staff.
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
      
      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Twilio Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Enter your Twilio credentials below. You can find these in your Twilio dashboard.
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Account SID"
                name="account_sid"
                value={settings.account_sid}
                onChange={handleChange}
                fullWidth
                required
              />
              
              <TextField
                label="Auth Token"
                name="auth_token"
                type={showAuthToken ? 'text' : 'password'}
                value={settings.auth_token}
                onChange={handleChange}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowAuthToken(!showAuthToken)}
                        edge="end"
                      >
                        {showAuthToken ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              <TextField
                label="From Number"
                name="from_number"
                value={settings.from_number}
                onChange={handleChange}
                fullWidth
                required
                placeholder="+1234567890"
                helperText="Must be a Twilio phone number in E.164 format (e.g., +1234567890)"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enable_sms_notifications}
                    onChange={handleChange}
                    name="enable_sms_notifications"
                    color="primary"
                  />
                }
                label="Enable SMS Notifications"
              />
            </Box>
          </Box>
        </CardContent>
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          <Button 
            variant="outlined" 
            onClick={handleTestSMS}
            disabled={!settings.account_sid || !settings.auth_token || !settings.from_number}
          >
            Test SMS
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSave}
            disabled={saveLoading}
          >
            {saveLoading ? <CircularProgress size={24} /> : 'Save Settings'}
          </Button>
        </CardActions>
      </Card>
      
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Test SMS Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Enter a phone number to send a test SMS message.
            </Typography>
            <TextField
              label="Phone Number"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="+1234567890"
              helperText="Enter phone number in E.164 format with country code (e.g., +1234567890)"
            />
            <TestResultAlert result={testResults} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Close
          </Button>
          <Button 
            onClick={sendTestSMS} 
            color="primary" 
            variant="contained"
            disabled={testLoading || !testPhone}
          >
            {testLoading ? <CircularProgress size={24} /> : 'Send Test SMS'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SMSSettings; 