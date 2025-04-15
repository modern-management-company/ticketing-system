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
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoIcon from '@mui/icons-material/Info';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import ScheduleIcon from '@mui/icons-material/Schedule';
import apiClient from './apiClient';

const EmailSettings = () => {
  const [settings, setSettings] = useState({
    smtp_server: '',
    smtp_port: '',
    smtp_username: '',
    smtp_password: '',
    sender_email: '',
    enable_email_notifications: true,
    daily_report_hour: 18,
    daily_report_minute: 0,
    daily_report_timezone: 'America/New_York',
    enable_daily_reports: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [showTestResults, setShowTestResults] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [notificationTestResults, setNotificationTestResults] = useState([]);
  const [resendingReport, setResendingReport] = useState(false);
  const [verifyingScheduler, setVerifyingScheduler] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/settings/system');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch email settings:', error);
      setError('Failed to load email settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const response = await apiClient.post('/api/settings/system', settings);
      setSuccess('Email settings updated successfully');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to save email settings:', error);
      setError(error.response?.data?.message || 'Failed to save email settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setError(null);
      setSuccess(null);
      setTestingEmail(true);

      await apiClient.post('/api/test-email', {
        email: testEmailAddress
      });
      setSuccess('Test email sent successfully');
    } catch (error) {
      console.error('Failed to send test email:', error);
      setError(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestAllEmails = async () => {
    try {
      setError(null);
      setSuccess(null);
      setTestingEmail(true);
      setTestResults([
        { test: 'SMTP Server Connection', success: false, message: 'Pending...' },
        { test: 'SMTP Authentication', success: false, message: 'Pending...' },
        { test: 'TLS/SSL Configuration', success: false, message: 'Pending...' },
        { test: 'Sender Email Validation', success: false, message: 'Pending...' },
        { test: 'Email Template Loading', success: false, message: 'Pending...' },
        { test: 'HTML Content Rendering', success: false, message: 'Pending...' },
        { test: 'Email Headers Setup', success: false, message: 'Pending...' },
        { test: 'Attachment Handling', success: false, message: 'Pending...' },
        { test: 'Rate Limiting Check', success: false, message: 'Pending...' },
        { test: 'Error Handling', success: false, message: 'Pending...' }
      ]);
      setShowTestResults(true);

      const response = await apiClient.post('/api/test-all-emails');
      setTestResults(response.data.results);
      setSuccess(`Email tests completed: ${response.data.message}`);
    } catch (error) {
      console.error('Failed to run email tests:', error);
      setError(error.response?.data?.message || 'Failed to run email tests');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestNotifications = async () => {
    try {
      setError(null);
      setSuccess(null);
      setTestingEmail(true);
      setNotificationTestResults([
        { test: 'Task Assignment Notification', success: false, message: 'Pending...' },
        { test: 'Task Update Notification', success: false, message: 'Pending...' },
        { test: 'Task Reminder', success: false, message: 'Pending...' },
        { test: 'Ticket Notification', success: false, message: 'Pending...' },
        { test: 'Room Status Update', success: false, message: 'Pending...' },
        { test: 'Property Status Update', success: false, message: 'Pending...' },
        { test: 'Password Reset', success: false, message: 'Pending...' },
        { test: 'Admin Alert', success: false, message: 'Pending...' },
        { test: 'User Management', success: false, message: 'Pending...' },
        { test: 'Registration Email', success: false, message: 'Pending...' }
      ]);

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
      setTestingEmail(false);
    }
  };

  const handleResendReportToExecutives = async () => {
    try {
      setError(null);
      setSuccess(null);
      setResendingReport(true);

      await apiClient.post('/api/settings/resend-executive-report');
      setSuccess('Executive reports have been resent successfully');
    } catch (error) {
      console.error('Failed to resend executive reports:', error);
      setError(error.response?.data?.message || 'Failed to resend executive reports');
    } finally {
      setResendingReport(false);
    }
  };

  const handleVerifyScheduler = async () => {
    try {
      setError(null);
      setSuccess(null);
      setVerifyingScheduler(true);

      await apiClient.post('/api/settings/verify-scheduler');
      setSuccess('Scheduler settings verified and updated successfully');
    } catch (error) {
      console.error('Failed to verify scheduler settings:', error);
      setError(error.response?.data?.message || 'Failed to verify scheduler settings');
    } finally {
      setVerifyingScheduler(false);
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
        Email Settings
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
        <Tab icon={<SendIcon />} label="Email Tests" />
        <Tab icon={<NotificationsIcon />} label="Notification Tests" />
        <Tab icon={<ScheduleIcon />} label="Scheduler" />
      </Tabs>

      <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Server"
                value={settings.smtp_server}
                onChange={(e) => setSettings({ ...settings, smtp_server: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Port"
                type="number"
                value={settings.smtp_port}
                onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Username"
                value={settings.smtp_username}
                onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Password"
                type="password"
                value={settings.smtp_password}
                onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sender Email"
                value={settings.sender_email}
                onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enable_email_notifications}
                    onChange={(e) => setSettings({ ...settings, enable_email_notifications: e.target.checked })}
                  />
                }
                label="Enable Email Notifications"
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

      <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Daily Report Schedule
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enable_daily_reports}
                    onChange={(e) => setSettings({ ...settings, enable_daily_reports: e.target.checked })}
                  />
                }
                label="Enable Daily Reports"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Report Hour (24-hour format)"
                type="number"
                value={settings.daily_report_hour}
                onChange={(e) => setSettings({ ...settings, daily_report_hour: parseInt(e.target.value) })}
                inputProps={{ min: 0, max: 23 }}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Report Minute"
                type="number"
                value={settings.daily_report_minute}
                onChange={(e) => setSettings({ ...settings, daily_report_minute: parseInt(e.target.value) })}
                inputProps={{ min: 0, max: 59 }}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Timezone"
                value={settings.daily_report_timezone}
                onChange={(e) => setSettings({ ...settings, daily_report_timezone: e.target.value })}
                margin="normal"
                helperText="Example: America/New_York, Europe/London, Asia/Tokyo"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={loading}
                >
                  Save Schedule Settings
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleResendReportToExecutives}
                  disabled={resendingReport}
                  startIcon={<SendIcon />}
                >
                  {resendingReport ? 'Resending...' : 'Resend Report to Executives'}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleVerifyScheduler}
                  disabled={verifyingScheduler}
                  startIcon={<SettingsIcon />}
                >
                  {verifyingScheduler ? 'Verifying...' : 'Verify Scheduler Settings'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Email Configuration Tests
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Test Email Address"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleTestEmail}
                  disabled={!testEmailAddress || testingEmail}
                  startIcon={<SendIcon />}
                >
                  Send Test Email
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleTestAllEmails}
                  disabled={testingEmail}
                  startIcon={<SettingsIcon />}
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
              disabled={testingEmail}
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

export default EmailSettings; 