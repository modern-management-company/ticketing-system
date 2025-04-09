import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import InfoIcon from '@mui/icons-material/Info';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import DeleteIcon from '@mui/icons-material/Delete';

const AttachmentSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    storage_type: 'local',
    max_file_size: 16 * 1024 * 1024, // 16MB default
    allowed_extensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'],
    upload_folder: 'uploads',
    s3_bucket_name: '',
    s3_region: '',
    s3_access_key: '',
    s3_secret_key: '',
    azure_account_name: '',
    azure_account_key: '',
    azure_container_name: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [newExtension, setNewExtension] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings/attachments');
      setSettings(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load settings');
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
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/settings/attachments', settings);
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSettings = async () => {
    setTestResult(null);
    try {
      const response = await axios.post('/api/settings/attachments/test', settings);
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
              {/* Storage Type Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Storage Type</InputLabel>
                  <Select
                    name="storage_type"
                    value={settings.storage_type}
                    onChange={handleChange}
                    label="Storage Type"
                  >
                    <MenuItem value="local">
                      <Box display="flex" alignItems="center">
                        <StorageIcon sx={{ mr: 1 }} />
                        Local Storage
                      </Box>
                    </MenuItem>
                    <MenuItem value="s3">
                      <Box display="flex" alignItems="center">
                        <CloudIcon sx={{ mr: 1 }} />
                        Amazon S3
                      </Box>
                    </MenuItem>
                    <MenuItem value="azure">
                      <Box display="flex" alignItems="center">
                        <CloudIcon sx={{ mr: 1 }} />
                        Azure Blob Storage
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Common Settings */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  name="max_file_size"
                  label="Maximum File Size (bytes)"
                  value={settings.max_file_size}
                  onChange={handleChange}
                  helperText={`Current limit: ${formatFileSize(settings.max_file_size)}`}
                />
              </Grid>

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
                    />
                    <Button
                      variant="outlined"
                      onClick={handleAddExtension}
                      disabled={!newExtension}
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
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>

              {/* S3 Settings */}
              {settings.storage_type === 's3' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Amazon S3 Settings
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="s3_bucket_name"
                      label="Bucket Name"
                      value={settings.s3_bucket_name}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="s3_region"
                      label="Region"
                      value={settings.s3_region}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="s3_access_key"
                      label="Access Key"
                      value={settings.s3_access_key}
                      onChange={handleChange}
                      type="password"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="s3_secret_key"
                      label="Secret Key"
                      value={settings.s3_secret_key}
                      onChange={handleChange}
                      type="password"
                    />
                  </Grid>
                </>
              )}

              {/* Azure Settings */}
              {settings.storage_type === 'azure' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Azure Blob Storage Settings
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="azure_account_name"
                      label="Account Name"
                      value={settings.azure_account_name}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="azure_container_name"
                      label="Container Name"
                      value={settings.azure_container_name}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="azure_account_key"
                      label="Account Key"
                      value={settings.azure_account_key}
                      onChange={handleChange}
                      type="password"
                    />
                  </Grid>
                </>
              )}

              {/* Local Storage Settings */}
              {settings.storage_type === 'local' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="upload_folder"
                    label="Upload Folder"
                    value={settings.upload_folder}
                    onChange={handleChange}
                    helperText="Relative path where files will be stored"
                  />
                </Grid>
              )}

              {/* Test and Save Buttons */}
              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={saving}
                    startIcon={<CloudUploadIcon />}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleTestSettings}
                    startIcon={<StorageIcon />}
                  >
                    Test Connection
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
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AttachmentSettings; 