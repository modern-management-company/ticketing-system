import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link as RouterLink, useLocation } from "react-router-dom";

import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Alert,
  CircularProgress,
  Grid,
  Link,
  FormControlLabel,
  Checkbox,
  Paper
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import apiClient from "../components/apiClient"; 

const Login = () => {
  const { login, auth, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: true // Default to checked
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFirstUser, setIsFirstUser] = useState(false);

  // Memoize the checkAuth function to prevent unnecessary re-renders
  const checkAuth = useCallback(async () => {
    if (auth?.isAuthenticated && auth?.token) {
      try {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } catch (error) {
        console.warn('Navigation error:', error);
      }
    }
  }, [auth, navigate, location]);

  useEffect(() => {
    if (!authLoading) {
      checkAuth();
    }
  }, [authLoading, checkAuth]);

  useEffect(() => {
    const checkFirst = async () => {
      try {
        const response = await apiClient.get('/check-first-user');
        setIsFirstUser(response.data.isFirstUser);
      } catch (error) {
        console.error('Failed to check first user status:', error);
        // Don't show error for this non-critical operation
      }
    };
    
    if (!authLoading) {
      checkFirst();
    }
  }, [authLoading]);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rememberMe' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.username || !formData.password) {
        throw new Error('Please enter both username and password');
      }
      
      const response = await apiClient.post('/login', {
        username: formData.username,
        password: formData.password,
        remember_me: formData.rememberMe
      });

      if (response.data && response.data.token) {
        await login(response.data);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different types of errors with user-friendly messages
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setError('Connection to server timed out. Please check your internet connection and try again.');
      } else if (error.message?.includes('Network Error')) {
        setError('Unable to connect to the server. Please check your internet connection or try again later.');
      } else if (error.response?.status === 401) {
        setError('Invalid username or password. Please try again.');
      } else if (error.response?.data?.msg) {
        setError(error.response.data.msg);
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '50vh'
          }}
        >
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Checking authentication...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Sign in to Ticketing System
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="rememberMe"
                  color="primary"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={loading}
                />
              }
              label="Remember me"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            <Grid container spacing={2}>
              {isFirstUser ? (
                <Grid item xs={12}>
                  <Link component={RouterLink} to="/register-admin" variant="body2">
                    Create Super Admin Account
                  </Link>
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <Link component={RouterLink} to="/register" variant="body2">
                    {"Don't have an account? Sign Up"}
                  </Link>
                </Grid>
              )}
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;