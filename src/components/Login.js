import React, { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";

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
import apiClient from "./apiClient"; 

const Login = () => {
  const navigate = useNavigate();
  const { login, checkFirstUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    const checkFirst = async () => {
      try {
        const isFirst = await checkFirstUser();
        setIsFirstUser(isFirst);
      } catch (error) {
        console.error('Failed to check first user status:', error);
      }
    };
    checkFirst();
  }, [checkFirstUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.username || !formData.password) {
        throw new Error('Please enter both username and password');
      }
      
      const response = await login(formData.username, formData.password);
      if (response && response.token) {
        navigate('/dashboard');
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to connect to the server. Please try again.');
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
      }}>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Username"
            name="username"
            autoFocus
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
    </Container>
  );
};

export default Login;