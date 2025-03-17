import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Link,
  Paper,
  FormControlLabel,
  Checkbox
} from "@mui/material";
import apiClient from "./apiClient";

const RegisterUser = ({ isAdminRegistration = false }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    consentToSms: false,
    role: isAdminRegistration ? "super_admin" : "user"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError("");
      setMessage("");
      
      // Validate required fields
      if (!formData.username || !formData.email || !formData.password) {
        setError("All fields are required");
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Please enter a valid email address");
        setLoading(false);
        return;
      }

      // Validate password length
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long");
        setLoading(false);
        return;
      }

      // Validate phone number if provided
      if (formData.phone && !formData.phone.match(/^\+?[1-9]\d{1,14}$/)) {
        setError("Please enter a valid phone number in international format (e.g., +1234567890)");
        setLoading(false);
        return;
      }

      // Register user
      const response = await apiClient.post("/register", formData);
      console.log('Registration response:', response.data);

      setMessage("Registration successful! Please check your email for login credentials. You will need to wait for an admin to assign you to properties.");
      
      // Clear form
      setFormData({
        username: "",
        email: "",
        password: "",
        phone: "",
        consentToSms: false,
        role: isAdminRegistration ? "super_admin" : "user"
      });

      // Navigate after showing success message
      setTimeout(() => {
        navigate('/login');
      }, 5000);  // Increased to 5 seconds to give user time to read the message

    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.msg || 
                          error.response?.data?.message || 
                          error.message || 
                          "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      maxWidth: 400, 
      mx: "auto", 
      mt: 4, 
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <Paper elevation={3} sx={{ p: 3, width: '100%' }}>
        <Typography variant="h4" gutterBottom align="center">
          {isAdminRegistration ? "Create Admin Account" : "Register User"}
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Phone Number"
            placeholder="+1234567890"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={loading}
          />
          
          <FormControlLabel 
            control={
              <Checkbox 
                checked={formData.consentToSms}
                onChange={(e) => setFormData({ ...formData, consentToSms: e.target.checked })}
                disabled={loading || !formData.phone}
              />
            } 
            label="I agree to receive SMS notifications" 
            sx={{ mt: 1, display: 'block' }}
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 2 }}>
            Standard message and data rates may apply. You can opt out at any time.
          </Typography>
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link component={RouterLink} to="/login" variant="body2">
            Already have an account? Sign in
          </Link>
        </Box>
      </Paper>

      <Snackbar
        open={!!message || !!error}
        autoHideDuration={6000}
        onClose={() => {
          setMessage("");
          setError("");
        }}
      >
        <Alert
          severity={message ? "success" : "error"}
          onClose={() => {
            setMessage("");
            setError("");
          }}
          sx={{ width: '100%' }}
        >
          {message || error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RegisterUser;
