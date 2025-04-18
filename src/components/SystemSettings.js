import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import EmailSettings from './EmailSettings';
import SMSSettings from './SMSSettings';
import AttachmentSettings from './AttachmentSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import AttachFileIcon from '@mui/icons-material/AttachFile';

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  const handleSuccess = (successMessage) => {
    setSuccess(successMessage);
    setTimeout(() => setSuccess(null), 5000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        System Settings
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

      {loading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<EmailIcon />}
            label="Email Settings"
            sx={{ minHeight: 72 }}
          />
          <Tab
            icon={<SmsIcon />}
            label="SMS Settings"
            sx={{ minHeight: 72 }}
          />
          <Tab
            icon={<AttachFileIcon />}
            label="Attachment Settings"
            sx={{ minHeight: 72 }}
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <EmailSettings
              onError={handleError}
              onSuccess={handleSuccess}
            />
          )}
          {activeTab === 1 && (
            <SMSSettings
              onError={handleError}
              onSuccess={handleSuccess}
            />
          )}
          {activeTab === 2 && (
            <AttachmentSettings
              onError={handleError}
              onSuccess={handleSuccess}
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default SystemSettings; 