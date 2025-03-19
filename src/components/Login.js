import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import apiClient from "../components/apiClient"; 

const Login = () => {
  const { login, auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [systemStatus, setSystemStatus] = useState('offline');

  useEffect(() => {
    const checkAuth = async () => {
      if (auth?.isAuthenticated && auth?.token) {
        try {
          await apiClient.get('/verify-token');
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        } catch (error) {
          console.warn('Token verification failed:', error);
        }
      }
    };
    checkAuth();
  }, [auth, navigate, location]);

  useEffect(() => {
    const checkFirst = async () => {
      try {
        const response = await apiClient.get('/check-first-user');
        setIsFirstUser(response.data.isFirstUser);
      } catch (error) {
        // Silently handle the error and assume it's not first user
        setIsFirstUser(false);
        // Don't set error state here
        console.debug('First user check failed, assuming not first user');
      }
    };
    checkFirst();
  }, []);

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        await apiClient.get('/ping');
        setSystemStatus('online');
      } catch (error) {
        if (!error.response) {
          setSystemStatus('offline');
        } else {
          setSystemStatus('online');
        }
      }
    };
    
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

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
        password: formData.password
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
      setError(
        error.response?.data?.msg || 
        error.message || 
        'Failed to connect to the server. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        position: 'relative',
      }}>
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
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={loading}
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

        <Box sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="body2">
            System Status:
          </Typography>
          <Box sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: systemStatus === 'online' ? 'success.main' : 'error.main'
          }} />
          <Typography variant="body2" color={systemStatus === 'online' ? 'success.main' : 'error.main'}>
            {systemStatus === 'online' ? 'Online' : 'Offline'}
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;