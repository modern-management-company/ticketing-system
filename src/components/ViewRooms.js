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
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useAuth } from '../context/AuthContext';

const ViewRooms = () => {
  const { auth } = useAuth();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [rooms, setRooms] = useState([]);
  const [editRoom, setEditRoom] = useState({});
  const [newRoomName, setNewRoomName] = useState("");
  const [message, setMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: '',
    floor: '',
    status: 'Available'
  });
  const [loading, setLoading] = useState(false);

  const fetchProperties = async () => {
    try {
      if (!auth?.token) {
        throw new Error('Authentication required');
      }

      setLoading(true);
      const response = await apiClient.get("/properties");
      
      if (!response.data?.properties) {
        throw new Error('Invalid response format');
      }
      
      setProperties(response.data.properties);
      if (response.data.properties.length > 0) {
        setSelectedProperty(response.data.properties[0].property_id);
      }
    } catch (error) {
      console.error("Failed to fetch properties", error);
      setMessage(error.message || "Failed to fetch properties");
      setSnackbarType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [auth]);

  const fetchRooms = async (propertyId) => {
    if (!propertyId || !auth?.token) return;
    
    try {
      const response = await apiClient.get(`/properties/${propertyId}/rooms`);
      if (!response.data?.rooms) {
        throw new Error('Invalid response format');
      }
      setRooms(response.data.rooms);
    } catch (error) {
      console.error("Failed to fetch rooms", error);
      setMessage(error.message || "Failed to fetch rooms");
      setSnackbarType("error");
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      fetchRooms(selectedProperty);
    }
  }, [selectedProperty]);

  const handleEdit = async (roomId) => {
    try {
      const response = await apiClient.patch(
        `/rooms/${roomId}`,
        { name: editRoom.name },
        { headers: { Authorization: `Bearer ${auth.token}` } }
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
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setMessage("Room deleted successfully!");
      setSnackbarType("success");
      setRooms((prev) => prev.filter((room) => room.room_id !== roomId));
    } catch (error) {
      setMessage("Failed to delete room.");
      setSnackbarType("error");
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!selectedProperty) {
      setMessage("Please select a property");
      setSnackbarType("error");
      return;
    }

    try {
      await apiClient.post(`/properties/${selectedProperty}/rooms`, newRoom);
      setMessage("Room created successfully!");
      setSnackbarType("success");
      setNewRoom({ name: '', type: '', floor: '', status: 'Available' });
      fetchRooms(selectedProperty);
    } catch (error) {
      setMessage("Failed to create room");
      setSnackbarType("error");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        View Rooms
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Add New Room
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Room Name"
              value={newRoom.name}
              onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={newRoom.type}
                onChange={(e) => setNewRoom(prev => ({ ...prev, type: e.target.value }))}
              >
                {['Single', 'Double', 'Suite', 'Conference'].map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Floor"
              value={newRoom.floor}
              onChange={(e) => setNewRoom(prev => ({ ...prev, floor: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleAddRoom}
              disabled={!newRoom.name || !newRoom.type}
            >
              Add Room
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Room ID</TableCell>
              <TableCell align="center">Name</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.room_id}>
                <TableCell align="center">{room.room_id}</TableCell>
                <TableCell align="center">{room.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
