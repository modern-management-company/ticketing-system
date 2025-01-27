import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import apiClient from "./apiClient"; // Import the centralized API client

const RegisterUser = ({ isAdminRegistration = false }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/register", {
        ...formData,
        isAdminRegistration,
      });
      setMessage("Registration successful!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 4, p: 2 }}>
      <Typography variant="h4" gutterBottom>
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
        />
        <TextField
          fullWidth
          margin="normal"
          label="Password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
        >
          Register
        </Button>
      </form>

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
        >
          {message || error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RegisterUser;
