import React, { useState } from "react";
import apiClient from "./apiClient"; 
import {
  Box,
  Button,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

const PropertyForm = ({ token }) => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(
        "/properties",
        { name, address },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Property added successfully!");
      setName("");
      setAddress("");
    } catch (error) {
      console.error("Failed to create property", error);
      setMessage("Failed to add property.");
    }
  };

  return (
    <Box sx={{ maxWidth: 600, margin: "auto", padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Add Property
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          margin="normal"
          label="Property Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Add Property
        </Button>
      </form>

      {message && (
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage("")}
        >
          <Alert
            severity={message.includes("successfully") ? "success" : "error"}
            onClose={() => setMessage("")}
          >
            {message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default PropertyForm;
