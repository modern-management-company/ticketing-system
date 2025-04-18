import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import StorageIcon from '@mui/icons-material/Storage';

const AttachmentSettings = ({ onError, onSuccess }) => {
  const { auth } = useAuth();
  const [settings, setSettings] = useState({
    storage_type: 'local',
    max_file_size: 16 * 1024 * 1024, // 16MB default
    allowed_extensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'],
    upload_folder: 'uploads'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newExtension, setNewExtension] = useState('');

  const isSuperAdmin = auth?.user?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/settings/attachments');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      if (onError) onError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!isSuperAdmin) {
        if (onError) onError('Super admin access required to manage attachment settings');
        return;
      }

      const response = await apiClient.post('/api/settings/attachments', settings);
      if (response.data) {
        if (onSuccess) onSuccess('Settings saved successfully');
        setSettings(response.data.settings || settings);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      if (onError) onError(err.response?.data?.msg || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSettings = async () => {
    if (!isSuperAdmin) {
      if (onError) onError('Super admin access required to test settings');
      return;
    }

    setTestResult(null);
    try {
      const response = await apiClient.post('/api/settings/attachments/test', settings);
      setTestResult({
        success: true,
        message: response.data?.msg || 'Connection test successful'
      });
    } catch (err) {
      console.error('Error testing settings:', err);
      setTestResult({
        success: false,
        message: err.response?.data?.msg || 'Connection test failed'
      });
    }
  };

  const handleAddExtension = () => {
    if (newExtension && !settings.allowed_extensions.includes(newExtension.toLowerCase())) {
      setSettings(prev => ({
        ...prev,
        allowed_extensions: [...prev.allowed_extensions, newExtension.toLowerCase()]
      }));
      setNewExtension('');
    }
  };

  const handleRemoveExtension = (extension) => {
    setSettings(prev => ({
      ...prev,
      allowed_extensions: prev.allowed_extensions.filter(ext => ext !== extension)
    }));
  };

  const formatFileSize = (bytes) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Global Attachment Settings
            {isSuperAdmin && <Typography variant="caption" color="success" sx={{ ml: 1 }}>(Super Admin Access)</Typography>}
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* File Size Settings */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  name="max_file_size"
                  label="Maximum File Size (bytes)"
                  value={settings.max_file_size}
                  onChange={handleChange}
                  helperText={`Current limit: ${formatFileSize(settings.max_file_size)}`}
                  disabled={!isSuperAdmin}
                />
              </Grid>

              {/* Allowed Extensions */}
              <Grid item xs={12}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Allowed File Extensions
                  </Typography>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TextField
                      size="small"
                      value={newExtension}
                      onChange={(e) => setNewExtension(e.target.value)}
                      placeholder="Add extension (e.g., pdf)"
                      sx={{ mr: 1 }}
                      disabled={!isSuperAdmin}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleAddExtension}
                      disabled={!newExtension || !isSuperAdmin}
                    >
                      Add
                    </Button>
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {settings.allowed_extensions.map((ext) => (
                      <Chip
                        key={ext}
                        label={ext}
                        onDelete={() => handleRemoveExtension(ext)}
                        color="primary"
                        variant="outlined"
                        disabled={!isSuperAdmin}
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>

              {/* Upload Folder */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="upload_folder"
                  label="Upload Folder"
                  value={settings.upload_folder}
                  onChange={handleChange}
                  helperText="Relative path where files will be stored"
                  disabled={!isSuperAdmin}
                />
              </Grid>

              {/* Test and Save Buttons */}
              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={saving || !isSuperAdmin}
                    startIcon={<CloudUploadIcon />}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleTestSettings}
                    startIcon={<StorageIcon />}
                    disabled={!isSuperAdmin}
                  >
                    Test Settings
                  </Button>
                </Box>
              </Grid>

              {/* Test Results */}
              {testResult && (
                <Grid item xs={12}>
                  <Alert severity={testResult.success ? 'success' : 'error'}>
                    {testResult.message}
                  </Alert>
                </Grid>
              )}

              {/* Access Message */}
              {!isSuperAdmin && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Super admin access required to manage attachment settings
                  </Alert>
                </Grid>
              )}
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AttachmentSettings; 