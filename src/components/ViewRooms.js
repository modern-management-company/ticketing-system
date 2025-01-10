import React, { useEffect, useState } from "react";
import apiClient from "./apiClient";
import {
  Box,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";

const ViewRooms = ({ token }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [rooms, setRooms] = useState([]);
  const [editRoom, setEditRoom] = useState({});
  const [newRoomName, setNewRoomName] = useState("");
  const [message, setMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await apiClient.get("/properties", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProperties(response.data.properties);
      } catch (error) {
        console.error("Failed to fetch properties", error);
      }
    };

    fetchProperties();
  }, [token]);

  const fetchRooms = async (propertyId) => {
    try {
      const response = await apiClient.get(`/properties/${propertyId}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(response.data.rooms);
    } catch (error) {
      console.error("Failed to fetch rooms", error);
    }
  };

  const handleEdit = async (roomId) => {
    try {
      const response = await apiClient.patch(
        `/rooms/${roomId}`,
        { name: editRoom.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Room updated successfully!");
      setSnackbarType("success");
      setRooms((prev) =>
        prev.map((room) =>
          room.room_id === roomId ? { ...room, name: editRoom.name } : room
        )
      );
      setEditRoom({});
    } catch (error) {
      setMessage("Failed to update room.");
      setSnackbarType("error");
    }
  };

  const handleDelete = async (roomId) => {
    try {
      await apiClient.delete(`/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Room deleted successfully!");
      setSnackbarType("success");
      setRooms((prev) => prev.filter((room) => room.room_id !== roomId));
    } catch (error) {
      setMessage("Failed to delete room.");
      setSnackbarType("error");
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName || !selectedProperty) {
      setMessage("Please enter a room name and select a property.");
      setSnackbarType("error");
      return;
    }
    try {
      const response = await apiClient.post(
        `/properties/${selectedProperty}/rooms`,
        { name: newRoomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Room added successfully!");
      setSnackbarType("success");
      setNewRoomName("");
      fetchRooms(selectedProperty); // Refresh the rooms list after adding
    } catch (error) {
      setMessage("Failed to add room.");
      setSnackbarType("error");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        View and Manage Rooms
      </Typography>
      <Select
        fullWidth
        value={selectedProperty}
        onChange={(e) => {
          setSelectedProperty(e.target.value);
          fetchRooms(e.target.value);
        }}
        displayEmpty
      >
        <MenuItem value="">Select Property</MenuItem>
        {properties.map((property) => (
          <MenuItem key={property.property_id} value={property.property_id}>
            {property.name}
          </MenuItem>
        ))}
      </Select>

      <Box mt={2} display="flex" gap={2}>
        <TextField
          fullWidth
          label="New Room Name"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddRoom}
          disabled={!selectedProperty}
        >
          Add Room
        </Button>
      </Box>

      <Box mt={4}>
        <Grid container spacing={2}>
          {rooms.map((room) => (
            <Grid item xs={6} sm={4} md={3} key={room.room_id}>
              <Box
                p={2}
                border={1}
                borderRadius={1}
                borderColor="grey.300"
                textAlign="center"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
              >
                {editRoom.room_id === room.room_id ? (
                  <TextField
                    fullWidth
                    defaultValue={room.name}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, name: e.target.value })
                    }
                  />
                ) : (
                  <Typography variant="h6">{room.name}</Typography>
                )}
                <Box mt={2} display="flex" gap={1}>
                  {editRoom.room_id === room.room_id ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={() => handleEdit(room.room_id)}
                    >
                      Save
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setEditRoom(room)}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDelete(room.room_id)}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage("")}
      >
        <Alert
          severity={snackbarType}
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ViewRooms;
