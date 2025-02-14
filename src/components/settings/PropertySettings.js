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
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import { SketchPicker } from 'react-color';
import {
  Palette as PaletteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import apiClient from '../apiClient';

const PropertySettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [themeColors, setThemeColors] = useState({
    primary: '#1976d2',
    secondary: '#dc004e',
    background: '#ffffff',
    accent: '#f50057',
  });

  useEffect(() => {
    fetchPropertyTheme();
  }, []);

  const fetchPropertyTheme = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/settings/property/theme');
      setThemeColors(response.data.colors);
    } catch (error) {
      setError('Failed to load property theme settings');
      console.error('Error fetching theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (color, colorKey) => {
    setThemeColors(prev => ({
      ...prev,
      [colorKey]: color.hex
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.post('/settings/property/theme', { colors: themeColors });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Failed to save theme settings');
      console.error('Error saving theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    fetchPropertyTheme();
  };

  const ColorPreview = ({ color, label, colorKey }) => (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 1 
      }}
    >
      <Typography variant="subtitle1">{label}</Typography>
      <Box
        sx={{
          width: 100,
          height: 100,
          backgroundColor: color,
          borderRadius: 1,
          border: '2px solid #ddd',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <Tooltip title="Change Color">
          <IconButton
            onClick={() => setShowColorPicker(colorKey)}
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              },
            }}
            size="small"
          >
            <PaletteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body2" color="textSecondary">
        {color}
      </Typography>
    </Paper>
  );

  if (loading && !showColorPicker) {
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
              Property Theme Settings
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
              Theme settings saved successfully!
            </Alert>
          )}

          <Grid container spacing={3}>
            {Object.entries(themeColors).map(([key, color]) => (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <ColorPreview
                  color={color}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  colorKey={key}
                />
              </Grid>
            ))}
          </Grid>

          {showColorPicker && (
            <Box
              sx={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 2,
                borderRadius: 1,
              }}
            >
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Choose Color
                </Typography>
                <Button onClick={() => setShowColorPicker(false)}>
                  Close
                </Button>
              </Box>
              <SketchPicker
                color={themeColors[showColorPicker]}
                onChange={(color) => handleColorChange(color, showColorPicker)}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PropertySettings; 