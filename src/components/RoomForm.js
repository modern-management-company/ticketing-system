import React, { useState, useEffect } from "react";
import apiClient from "./apiClient"; 
import {
  TextField,
  Button,
  Typography,
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
} from "@mui/material";

const RoomForm = ({ token }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [roomName, setRoomName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await apiClient.get("/properties", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProperties(response.data.properties);
      } catch (error) {
        console.error(error);
      }
    };
    fetchProperties();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post(
        `/properties/${selectedProperty}/rooms`,
        { name: roomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Room created successfully!");
      setError(false);
    } catch (error) {
      console.error(error);
      setMessage("Failed to create room.");
      setError(true);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, margin: "0 auto", mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Add Room
      </Typography>
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Select Property</InputLabel>
          <Select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            required
          >
            {properties.map((property) => (
              <MenuItem
                key={property.property_id}
                value={property.property_id}
              >
                {property.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          fullWidth
          required
          margin="normal"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Add Room
        </Button>
      </form>
      {message && (
        <Alert severity={error ? "error" : "success"} sx={{ mt: 2 }}>
          {message}
        </Alert>
      )}
    </Box>
  );
};

export default RoomForm;
