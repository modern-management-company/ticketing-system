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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import StorageIcon from '@mui/icons-material/Storage';
import LockIcon from '@mui/icons-material/Lock';

const AttachmentSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    max_file_size: 16 * 1024 * 1024, // 16MB default
    allowed_extensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'],
    upload_folder: 'uploads',
    property_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [newExtension, setNewExtension] = useState('');
  const [showProDialog, setShowProDialog] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const isProUser = user?.subscription_plan === 'premium';

  useEffect(() => {
    fetchSettings();
    if (isProUser) {
      fetchProperties();
    }
  }, [isProUser]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await apiClient.get('/api/properties');
      setProperties(response.data || []);
    } catch (err) {
      // Silently handle the error and set empty properties
      setProperties([]);
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/api/settings/attachments');
      setSettings(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load settings');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Check if the change requires pro plan
    if (name === 'max_file_size' && value > 16 * 1024 * 1024) {
      if (!isProUser) {
        setShowProDialog(true);
        return;
      }
    }
    
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!isProUser) {
        setError('Pro plan required to manage attachment settings');
        return;
      }

      await apiClient.post('/api/settings/attachments', settings);
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSettings = async () => {
    if (!isProUser) {
      setShowProDialog(true);
      return;
    }

    setTestResult(null);
    try {
      const response = await apiClient.post('/api/settings/attachments/test', settings);
      setTestResult({
        success: true,
        message: 'Connection test successful'
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.error || 'Connection test failed'
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
            Attachment Settings
            {!isProUser && <LockIcon sx={{ ml: 1, fontSize: '1rem' }} />}
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Property Selection */}
              {isProUser && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Property</InputLabel>
                    <Select
                      name="property_id"
                      value={settings.property_id}
                      onChange={handleChange}
                      label="Property"
                      disabled={loadingProperties}
                    >
                      {loadingProperties ? (
                        <MenuItem value="" disabled>
                          <Box display="flex" alignItems="center" gap={1}>
                            <CircularProgress size={20} />
                            Loading properties...
                          </Box>
                        </MenuItem>
                      ) : properties.length > 0 ? (
                        properties.map((property) => (
                          <MenuItem key={property.id} value={property.id}>
                            {property.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="" disabled>
                          No properties available
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* File Size Settings */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  name="max_file_size"
                  label="Maximum File Size (bytes)"
                  value={settings.max_file_size}
                  onChange={handleChange}
                  helperText={`Current limit: ${formatFileSize(settings.max_file_size)}${!isProUser ? ' (Upgrade to Pro for larger file sizes)' : ''}`}
                  disabled={!isProUser}
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
                      disabled={!isProUser}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleAddExtension}
                      disabled={!newExtension || !isProUser}
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
                        disabled={!isProUser}
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
                  disabled={!isProUser}
                />
              </Grid>

              {/* Test and Save Buttons */}
              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={saving || !isProUser}
                    startIcon={<CloudUploadIcon />}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleTestSettings}
                    startIcon={<StorageIcon />}
                    disabled={!isProUser}
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

              {/* Pro Plan Message */}
              {!isProUser && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Upgrade to Pro plan to manage attachment settings and enable file uploads for your properties.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Pro Plan Dialog */}
      <Dialog open={showProDialog} onClose={() => setShowProDialog(false)}>
        <DialogTitle>Pro Plan Required</DialogTitle>
        <DialogContent>
          <Typography>
            This feature is only available with our Pro plan. Upgrade to access:
          </Typography>
          <ul>
            <li>File Upload Management</li>
            <li>Larger File Size Limits</li>
            <li>Property-based Attachment Settings</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProDialog(false)}>Cancel</Button>
          <Button onClick={() => window.location.href = '/pricing'} color="primary">
            View Pricing
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttachmentSettings; 