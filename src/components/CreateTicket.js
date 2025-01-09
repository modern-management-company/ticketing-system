import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from "@mui/material";

const CreateTicket = ({ token }) => {
  const [categories] = useState(["Maintenance", "Cleaning", "Other"]);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await axios.get("/properties", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProperties(response.data.properties);
      } catch (error) {
        console.error(error);
      }
    };
    fetchProperties();
  }, [token]);

  const fetchRooms = async (propertyId) => {
    try {
      const response = await axios.get(`/properties/${propertyId}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(response.data.rooms);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePropertyChange = (e) => {
    setSelectedProperty(e.target.value);
    fetchRooms(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "/tickets",
        {
          title,
          description,
          priority,
          category: categories[0], // Example: use first category for now
          property_id: selectedProperty,
          room_id: selectedRoom,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Ticket created successfully!");
    } catch (error) {
      console.error(error);
      setMessage("Failed to create ticket.");
    }
  };

  return (
    <Box sx={{ maxWidth: 600, margin: "auto", padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Create Ticket
      </Typography>
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Property</InputLabel>
          <Select
            value={selectedProperty}
            onChange={handlePropertyChange}
            required
          >
            {properties.map((property) => (
              <MenuItem key={property.property_id} value={property.property_id}>
                {property.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Room</InputLabel>
          <Select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            required
          >
            {rooms.map((room) => (
              <MenuItem key={room.room_id} value={room.room_id}>
                {room.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          margin="normal"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <TextField
          fullWidth
          margin="normal"
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={4}
          required
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Priority</InputLabel>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            required
          >
            <MenuItem value="Low">Low</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="High">High</MenuItem>
          </Select>
        </FormControl>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Create Ticket
        </Button>
      </form>

      {message && (
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage("")}
        >
          <Alert severity="success" onClose={() => setMessage("")}>
            {message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default CreateTicket;