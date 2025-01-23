import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '.apiClient';
import { Box, Typography, Grid, Paper, List, ListItem, ListItemText, Alert, TextField, Button } from '@mui/material';
import { CircularProgress } from '@mui/material';

const UserProfile = () => {
  const { auth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get(`/users/${auth.userId}/profile`);
        setProfile(response.data);
      } catch (error) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [auth.userId]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      await apiClient.post(`/users/${auth.userId}/change-password`, {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      setMessage('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setError('Failed to update password');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>User Profile</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      {profile && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Profile Information</Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Username" secondary={profile.username} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Role" secondary={profile.role} />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Assigned Property" 
                    secondary={profile.assigned_property_name || 'None'} 
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Change Password</Typography>
              <form onSubmit={handlePasswordChange}>
                <TextField
                  type="password"
                  label="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value
                  })}
                  fullWidth
                  margin="normal"
                  required
                />
                <TextField
                  type="password"
                  label="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value
                  })}
                  fullWidth
                  margin="normal"
                  required
                />
                <TextField
                  type="password"
                  label="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value
                  })}
                  fullWidth
                  margin="normal"
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Update Password
                </Button>
              </form>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default UserProfile; 