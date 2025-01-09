import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";

const ViewRooms = ({ token }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [rooms, setRooms] = useState([]);
  const [editRoom, setEditRoom] = useState({});
  const [newRoomName, setNewRoomName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await axios.get("/properties", {
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
      const response = await axios.get(`/properties/${propertyId}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(response.data.rooms);
    } catch (error) {
      console.error("Failed to fetch rooms", error);
    }
  };

  const handleEdit = async (roomId) => {
    try {
      const response = await axios.patch(
        `/rooms/${roomId}`,
        { name: editRoom.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      setRooms((prev) =>
        prev.map((room) =>
          room.room_id === roomId ? { ...room, name: editRoom.name } : room
        )
      );
      setEditRoom({});
    } catch (error) {
      console.error("Failed to edit room", error);
    }
  };

  const handleDelete = async (roomId) => {
    try {
      const response = await axios.delete(`/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(response.data.message);
      setRooms((prev) => prev.filter((room) => room.room_id !== roomId));
    } catch (error) {
      console.error("Failed to delete room", error);
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName || !selectedProperty) {
      setMessage("Please enter a room name and select a property.");
      return;
    }
    try {
      const response = await axios.post(
        `/properties/${selectedProperty}/rooms`,
        { name: newRoomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      setNewRoomName("");
      fetchRooms(selectedProperty); // Refresh the rooms list after adding
    } catch (error) {
      console.error("Failed to add room", error);
      setMessage("Failed to add room.");
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
      <TableContainer component={Paper} sx={{ marginTop: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Room ID</TableCell>
              <TableCell align="center">Name</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.room_id}>
                <TableCell align="center">{room.room_id}</TableCell>
                <TableCell align="center">
                  {editRoom.room_id === room.room_id ? (
                    <TextField
                      defaultValue={room.name}
                      onChange={(e) =>
                        setEditRoom({ ...editRoom, name: e.target.value })
                      }
                    />
                  ) : (
                    room.name
                  )}
                </TableCell>
                <TableCell align="center">
                  {editRoom.room_id === room.room_id ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleEdit(room.room_id)}
                    >
                      Save
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => setEditRoom(room)}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDelete(room.room_id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {message && <Typography color="success.main">{message}</Typography>}
    </Box>
  );
};

export default ViewRooms;
