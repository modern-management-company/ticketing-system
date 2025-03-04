import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PropertySwitcher from './PropertySwitcher';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const ViewRooms = () => {
  const { auth } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    type: '',
    floor: '',
    status: 'Available'
  });
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const fileInputRef = React.useRef();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [uploadInProgress, setUploadInProgress] = useState(false);

  const roomTypes = ['Single', 'Double', 'Suite', 'Conference', 'Other'];
  const roomStatuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning'];

  useEffect(() => {
    console.log('Full Auth context:', auth);
    console.log('User role:', auth?.user?.role);
    console.log('User group:', auth?.user?.group);
    console.log('Is manager:', auth?.user?.role === 'manager' || auth?.user?.role === 'super_admin');
    console.log('Is maintenance/engineering:', ['Maintenance', 'Engineering'].includes(auth?.user?.group));
  }, [auth]);

  const isManager = auth?.user?.role === 'manager' || auth?.user?.role === 'super_admin';

  useEffect(() => {
    if (selectedProperty) {
      fetchRooms();
    }
  }, [selectedProperty]);

  const fetchRooms = async () => {
    if (!selectedProperty) return;

    try {
      setLoading(true);
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      if (response.data && Array.isArray(response.data.rooms)) {
        const processedRooms = response.data.rooms.map(room => ({
          ...room,
          type: room.type || roomTypes[0]
        }));
        setRooms(processedRooms);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  const handleAddRoom = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!roomFormData.name) {
        setError('Room name is required');
        return;
      }

      const response = await apiClient.post(`/properties/${selectedProperty}/rooms`, roomFormData);
      if (response.data) {
        setSuccess('Room added successfully');
        await fetchRooms();
        setOpenDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add room:', error);
      setError(error.response?.data?.message || 'Failed to add room');
    }
  };

  const handleEditRoom = async (roomId) => {
    try {
      await apiClient.put(`/properties/${selectedProperty}/rooms/${roomId}`, roomFormData);
      setSuccess('Room updated successfully');
      await fetchRooms();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        setError(null);
        setSuccess(null);
        setLoading(true);

        const response = await apiClient.delete(`/properties/${selectedProperty}/rooms/${roomId}`);

        if (response.status === 200) {
          setSuccess('Room deleted successfully');
          setRooms(prevRooms => prevRooms.filter(room => room.room_id !== roomId));
        }
      } catch (error) {
        console.error('Failed to delete room:', error);
        setError(error.response?.data?.msg || 'Failed to delete room');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setRoomFormData({
      name: '',
      type: '',
      floor: '',
      status: 'Available'
    });
  };

  const getUniqueFloors = () => {
    const floors = rooms.map(room => room.floor).filter(floor => floor !== null && floor !== undefined);
    return [...new Set(floors)].sort((a, b) => a - b);
  };

  const filteredRooms = rooms.filter(room =>
    selectedFloor === 'all' || room.floor === selectedFloor
  );

  const downloadTemplate = () => {
    const headers = ['name', 'type', 'floor', 'status', 'capacity', 'description'];
    const sampleData = [
      'Room 101,Single,1,Available,2,Standard single room',
      'Room 102,Double,1,Available,4,Spacious double room',
      'Conference A,Conference,2,Available,20,Large conference room'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rooms_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    setUploadDialogOpen(true);
    setUploadInProgress(true);
    setUploadResults(null);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('property_id', selectedProperty);

    try {
      const response = await apiClient.post(`/properties/${selectedProperty}/rooms/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResults(response.data);
      setUploadSuccess(response.data.msg);
      await fetchRooms();
    } catch (error) {
      console.error('Failed to upload rooms:', error);
      const errorMsg = error.response?.data?.msg || 'Failed to upload rooms';
      setUploadError(errorMsg);
      setUploadResults({
        msg: errorMsg,
        errors: error.response?.data?.errors || []
      });
    } finally {
      setUploadInProgress(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const closeUploadDialog = () => {
    setUploadDialogOpen(false);
    setUploadResults(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Room Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <PropertySwitcher onPropertyChange={handlePropertyChange} />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Floor</InputLabel>
            <Select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              label="Floor"
            >
              <MenuItem value="all">All Floors</MenuItem>
              {getUniqueFloors().map(floor => (
                <MenuItem key={floor} value={floor}>Floor {floor}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedProperty && isManager && (
            <>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Add Room
              </Button>
              <Tooltip title="Download a CSV template to fill with room data">
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={downloadTemplate}
                >
                  Download Template
                </Button>
              </Tooltip>
              <Tooltip title="Upload a CSV file with room data. This will add new rooms and update existing ones.">
                <Button
                  variant="contained"
                  color="secondary"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  sx={{ 
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  Upload Rooms CSV
                  <input
                    type="file"
                    hidden
                    accept=".csv"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                  />
                </Button>
              </Tooltip>
              <Tooltip title="CSV file should have columns: name, type, floor, status, capacity (optional), description (optional)">
                <IconButton color="primary">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
      {uploadSuccess && <Alert severity="success" sx={{ mb: 2 }}>{uploadSuccess}</Alert>}

      {selectedProperty ? (
        loading ? (
          <CircularProgress />
        ) : (
          <Grid container spacing={3}>
            {filteredRooms.map((room) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={room.room_id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      display: 'flex',
                      gap: 1
                    }}>
                      <Chip
                        label={room.status}
                        size="small"
                        color={
                          room.status === 'Available' ? 'success' :
                            room.status === 'Occupied' ? 'error' :
                              room.status === 'Maintenance' ? 'warning' :
                                'default'
                        }
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
                      <MeetingRoomIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" component="div">
                        {room.name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography color="textSecondary">
                        Type: {room.type || 'N/A'}
                      </Typography>
                      <Typography color="textSecondary">
                        Floor: {room.floor || 'N/A'}
                      </Typography>
                    </Box>
                  </CardContent>
                  {(isManager || auth?.user?.role === 'super_admin' || ['Maintenance', 'Engineering'].includes(auth?.user?.group)) && (
                    <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                      <IconButton
                        onClick={() => {
                          const roomToEdit = {
                            ...room,
                            type: room.type || roomTypes[0]
                          };
                          setRoomFormData(roomToEdit);
                          setOpenDialog(true);
                        }}
                        color="primary"
                        size="small"
                        title="Edit Room"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteRoom(room.room_id)}
                        color="error"
                        size="small"
                        title="Delete Room"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      ) : (
        <Alert severity="info">Please select a property to view rooms</Alert>
      )}

      <Dialog open={openDialog} onClose={() => {
        setOpenDialog(false);
        resetForm();
      }}>
        <DialogTitle>
          {roomFormData.room_id ? 'Edit Room' : 'Add New Room'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Room Name"
              value={roomFormData.name}
              onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Room Type"
              value={roomFormData.type}
              onChange={(e) => setRoomFormData({ ...roomFormData, type: e.target.value })}
              fullWidth
            />
            <TextField
              label="Floor"
              value={roomFormData.floor}
              onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
              fullWidth
              type="number"
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={roomFormData.status}
                onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                label="Status"
              >
                {roomStatuses.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button
            onClick={() => roomFormData.room_id ? handleEditRoom(roomFormData.room_id) : handleAddRoom()}
            variant="contained"
            color="primary"
          >
            {roomFormData.room_id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Results Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={closeUploadDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>CSV Upload Results</DialogTitle>
        <DialogContent>
          {uploadInProgress ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : uploadResults ? (
            <Box>
              <Alert 
                severity={uploadError ? "error" : "success"} 
                sx={{ mb: 2 }}
              >
                {uploadResults.msg}
              </Alert>
              
              {uploadResults.rooms_added > 0 && (
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Rooms Added: {uploadResults.rooms_added}
                </Typography>
              )}
              
              {uploadResults.rooms_updated > 0 && (
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Rooms Updated: {uploadResults.rooms_updated}
                </Typography>
              )}
              
              {uploadResults.errors && uploadResults.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Errors:
                  </Typography>
                  <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                    <List dense>
                      {uploadResults.errors.map((error, index) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemText primary={error} />
                          </ListItem>
                          {index < uploadResults.errors.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}
            </Box>
          ) : (
            <Typography>Processing your file...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUploadDialog} disabled={uploadInProgress}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewRooms;
