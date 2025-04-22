import React, { useState, useEffect, useRef } from "react";
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
  Tooltip,
  Switch,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Autocomplete
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
import { useNavigate } from "react-router-dom";
import AssignmentIcon from '@mui/icons-material/Assignment';
import RoomServiceIcon from '@mui/icons-material/RoomService';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SyncIcon from '@mui/icons-material/Sync';
import { getFriendlyRoomName, getHotelRoomTypes } from '../utils/roomMappings';

const ViewRooms = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
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
    status: 'Available',
    capacity: '',
    amenities: [],
    description: '',
    last_cleaned: ''
  });
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const fileInputRef = React.useRef();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const [hidePublicAreas, setHidePublicAreas] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [hotelChain, setHotelChain] = useState('MAR'); // Default to Marriott
  const [availableRoomTypes, setAvailableRoomTypes] = useState([]);
  const [displayRoomType, setDisplayRoomType] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [roomTickets, setRoomTickets] = useState([]);
  const [roomTasks, setRoomTasks] = useState([]);
  const [loadingRoomData, setLoadingRoomData] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);

  const roomStatuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning'];
  
  // Common amenities list
  const commonAmenities = [
    'WiFi',
    'TV',
    'Air Conditioning',
    'Heating',
    'Mini-bar',
    'Coffee Machine',
    'Safe',
    'Desk',
    'Iron',
    'Hair Dryer',
    'Bathtub',
    'Shower',
    'Balcony',
    'Ocean View',
    'City View',
    'Refrigerator',
    'Microwave',
    'Room Service',
    'Wheelchair Accessible',
    'Pet Friendly'
  ];

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

  useEffect(() => {
    // Initialize room types based on hotel chain
    const types = getHotelRoomTypes(hotelChain);
    setAvailableRoomTypes(types);
  }, [hotelChain]);

  useEffect(() => {
    const types = getHotelRoomTypes(hotelChain);
    setAvailableTypes(types);
  }, [hotelChain]);

  const fetchRooms = async () => {
    if (!selectedProperty) return;

    try {
      setLoading(true);
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      if (response.data && Array.isArray(response.data.rooms)) {
        const processedRooms = response.data.rooms.map(room => ({
          ...room,
          type: room.type || availableRoomTypes[0]?.code
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
    // You might want to set the hotel chain based on the property
    // This is just an example - you'll need to get the actual chain from your property data
    if (propertyId) {
      // Example: Check property name or other attributes to determine chain
      // This is just a placeholder - implement your actual logic
      const chain = determineHotelChain(propertyId);
      setHotelChain(chain);
    }
  };

  const determineHotelChain = (propertyId) => {
    // Implement your logic to determine the hotel chain based on property
    // This is just an example - you'll need to implement your actual logic
    return 'MAR'; // Default to Marriott
  };

  const handleAddRoom = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!roomFormData.name) {
        setError('Room name is required');
        return;
      }

      // Create a copy of the form data to modify
      const formDataToSend = { ...roomFormData };
      
      // Ensure capacity is sent as a number if it's not empty
      if (formDataToSend.capacity !== '' && formDataToSend.capacity !== null && formDataToSend.capacity !== undefined) {
        formDataToSend.capacity = Number(formDataToSend.capacity);
      } else {
        formDataToSend.capacity = null;
      }
      
      // Ensure amenities is always an array
      if (!formDataToSend.amenities) {
        formDataToSend.amenities = [];
      }
      
      console.log('Sending room data for creation:', formDataToSend);

      const response = await apiClient.post(`/properties/${selectedProperty}/rooms`, formDataToSend);
      console.log('Room creation response:', response.data);
      
      if (response.data) {
        setSuccess('Room added successfully');
        await fetchRooms();
        setOpenDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add room:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || error.response?.data?.msg || 'Failed to add room');
    }
  };

  const handleEditRoom = async (roomId) => {
    try {
      const formDataToSend = { ...roomFormData };
      
      // Ensure capacity is sent as a number if it's not empty
      if (formDataToSend.capacity !== '' && formDataToSend.capacity !== null && formDataToSend.capacity !== undefined) {
        formDataToSend.capacity = Number(formDataToSend.capacity);
      } else {
        formDataToSend.capacity = null;
      }
      
      // Ensure amenities is always an array
      if (!formDataToSend.amenities) {
        formDataToSend.amenities = [];
      }
      
      console.log('Sending room data for update:', formDataToSend);
      
      const response = await apiClient.put(`/properties/${selectedProperty}/rooms/${roomId}`, formDataToSend);
      console.log('Room update response:', response.data);
      
      setSuccess('Room updated successfully');
      await fetchRooms();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to update room:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || error.response?.data?.msg || 'Failed to update room');
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
      status: 'Available',
      capacity: '',
      amenities: [],
      description: '',
      last_cleaned: ''
    });
  };

  const getUniqueFloors = () => {
    const floors = rooms.map(room => room.floor).filter(floor => floor !== null && floor !== undefined);
    return [...new Set(floors)].sort((a, b) => a - b);
  };

  const getUniqueRoomTypes = () => {
    const types = new Set(rooms.map(room => room.type));
    return Array.from(types).sort();
  };

  const filteredRooms = rooms.filter(room => 
    (selectedFloor === 'all' || room.floor === selectedFloor) && 
    (selectedStatus === 'all' || room.status === selectedStatus) &&
    (selectedType === 'all' || room.type === selectedType) &&
    !(hidePublicAreas && room.type?.toLowerCase() === 'public area') &&
    (selectedAmenities.length === 0 || 
      (Array.isArray(room.amenities) && 
       selectedAmenities.every(amenity => room.amenities.includes(amenity))))
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

  // Helper function to format date for datetime-local input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  };

  const handleRoomCardClick = (room) => {
    setSelectedRoom(room);
    setActionDialogOpen(true);
    fetchRoomTicketsAndTasks(room.room_id);
  };

  const fetchRoomTicketsAndTasks = async (roomId) => {
    try {
      setLoadingRoomData(true);
      // Fetch tickets related to this room
      const ticketsResponse = await apiClient.get(`/rooms/${roomId}/tickets`);
      if (ticketsResponse.data && Array.isArray(ticketsResponse.data.tickets)) {
        // Sort tickets by priority and then by duration (created_at date)
        const sortedTickets = ticketsResponse.data.tickets.sort((a, b) => {
          const priorityOrder = {
            'Critical': 0,
            'High': 1,
            'Medium': 2,
            'Low': 3
          };
          
          // First, sort by priority
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          
          // If priority is the same, sort by duration (oldest first)
          const aDate = new Date(a.created_at);
          const bDate = new Date(b.created_at);
          return aDate - bDate;
        });
        
        console.log('Sorted tickets:', sortedTickets.map(t => ({
          id: t.ticket_id,
          priority: t.priority,
          created: t.created_at
        })));
        
        setRoomTickets(sortedTickets);
      } else {
        setRoomTickets([]);
      }
      
      // Fetch tasks related to this room
      const tasksResponse = await apiClient.get(`/rooms/${roomId}/tasks`);
      if (tasksResponse.data && Array.isArray(tasksResponse.data.tasks)) {
        // Sort tasks by priority and then by duration (created_at date)
        const sortedTasks = tasksResponse.data.tasks.sort((a, b) => {
          const priorityOrder = {
            'Critical': 0,
            'High': 1,
            'Medium': 2,
            'Low': 3
          };
          
          // First, sort by priority
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          
          // If priority is the same, sort by duration (oldest first)
          const aDate = new Date(a.created_at);
          const bDate = new Date(b.created_at);
          return aDate - bDate;
        });
        
        console.log('Sorted tasks:', sortedTasks.map(t => ({
          id: t.task_id,
          priority: t.priority,
          created: t.created_at
        })));
        
        setRoomTasks(sortedTasks);
      } else {
        setRoomTasks([]);
      }
    } catch (error) {
      console.error('Failed to fetch room data:', error);
      setRoomTickets([]);
      setRoomTasks([]);
    } finally {
      setLoadingRoomData(false);
    }
  };

  const navigateToTickets = () => {
    if (!selectedRoom) return;
    
    navigate('/tickets', { 
      state: { 
        createTicket: true,
        roomId: selectedRoom.room_id,
        roomName: selectedRoom.name,
        propertyId: selectedProperty
      } 
    });
    setActionDialogOpen(false);
  };

  const navigateToServiceRequests = () => {
    if (!selectedRoom) return;
    
    navigate('/requests', { 
      state: { 
        createRequest: true,
        roomId: selectedRoom.room_id,
        roomName: selectedRoom.name,
        propertyId: selectedProperty
      } 
    });
    setActionDialogOpen(false);
  };

  const handleRoomTypeChange = (e) => {
    const code = e.target.value.toUpperCase();
    setRoomFormData({ ...roomFormData, type: code });
    setDisplayRoomType(getFriendlyRoomName(code, hotelChain));
  };

  const getRoomTypeHelperText = () => {
    switch (hotelChain) {
      case 'BWH':
        return 'Enter room type code (e.g., NQQ1 for Standard Two Queen Room)';
      case 'MAR':
        return 'Enter room type code (e.g., STDO for Standard Room)';
      case 'HIL':
        return 'Enter room type code (e.g., STDO for Standard Room)';
      default:
        return 'Enter room type code';
    }
  };

  // Modified function to sync a single room status instead of all rooms
  const syncRoomStatus = async (room, e) => {
    if (e) {
      e.stopPropagation(); // Prevent room card click event
    }
    
    try {
      setSyncInProgress(true);
      setSyncMessage(null);
      setSyncResults(null);
      
      console.log(`Processing room ${room.name} (ID: ${room.room_id}), current status: ${room.status}`);
      
      // Get tickets for this room
      const ticketsResponse = await apiClient.get(`/rooms/${room.room_id}/tickets`);
      const tickets = ticketsResponse.data.tickets || [];
      console.log(`Found ${tickets.length} tickets for room ${room.name}`);
      
      // Check if there are any active tickets
      const activeTickets = tickets.filter(ticket => 
        ticket.status === 'open' || ticket.status === 'in progress'
      );
      console.log(`${activeTickets.length} active tickets for room ${room.name}`);
      
      let newStatus = room.status;
      let shouldUpdate = false;
      
      // If room is marked as maintenance/cleaning but no active tickets
      if ((room.status === 'Maintenance' || room.status === 'Cleaning') && activeTickets.length === 0) {
        newStatus = 'Available';
        shouldUpdate = true;
        console.log(`Room ${room.name} should be updated from ${room.status} to Available (no active tickets)`);
      }
      // If room has maintenance tickets but isn't marked as maintenance
      else if (activeTickets.some(ticket => ticket.category === 'Maintenance') && room.status !== 'Maintenance') {
        newStatus = 'Maintenance';
        shouldUpdate = true;
        console.log(`Room ${room.name} should be updated from ${room.status} to Maintenance`);
      }
      // If room has housekeeping tickets but isn't marked as cleaning
      else if (activeTickets.some(ticket => ticket.category === 'Housekeeping') && room.status !== 'Cleaning') {
        newStatus = 'Cleaning';
        shouldUpdate = true;
        console.log(`Room ${room.name} should be updated from ${room.status} to Cleaning`);
      }
      
      if (shouldUpdate) {
        console.log(`Sending PATCH request to update room ${room.name} status to ${newStatus}`);
        try {
          const response = await apiClient.patch(`/properties/${selectedProperty}/rooms/${room.room_id}`, {
            status: newStatus
          });
          
          console.log(`Update response for room ${room.name}:`, response.status, response.data);
          
          if (response.status === 200) {
            const statusUpdate = {
              room: room.name,
              oldStatus: room.status,
              newStatus: newStatus,
              success: true
            };
            
            setSyncResults({
              updated: 1,
              skipped: 0,
              errors: 0,
              details: [statusUpdate]
            });
            
            // Update the room in the local state
            setRooms(prevRooms => 
              prevRooms.map(r => 
                r.room_id === room.room_id ? {...r, status: newStatus} : r
              )
            );
            
            setSyncMessage(`Room ${room.name} status synchronized from ${room.status} to ${newStatus}`);
          } else {
            console.error(`Failed to update room ${room.name} status: Unexpected status code ${response.status}`);
            setSyncResults({
              updated: 0,
              skipped: 0,
              errors: 1,
              details: [{
                room: room.name,
                oldStatus: room.status,
                error: `Unexpected status code: ${response.status}`,
                success: false
              }]
            });
            setSyncMessage(`Failed to synchronize room ${room.name} status.`);
          }
        } catch (updateError) {
          console.error(`Error updating room ${room.name}:`, updateError);
          setSyncResults({
            updated: 0,
            skipped: 0,
            errors: 1,
            details: [{
              room: room.name,
              oldStatus: room.status,
              error: updateError.response?.data?.msg || updateError.message,
              success: false
            }]
          });
          setSyncMessage(`Error synchronizing room ${room.name} status: ${updateError.response?.data?.msg || updateError.message}`);
        }
      } else {
        console.log(`No status change needed for room ${room.name}`);
        setSyncResults({
          updated: 0,
          skipped: 1,
          errors: 0,
          details: [{
            room: room.name,
            oldStatus: room.status,
            message: "No status change needed",
            success: true
          }]
        });
        setSyncMessage(`Room ${room.name} status is already in sync with ticket status.`);
      }
    } catch (error) {
      console.error(`Error syncing room ${room.name}:`, error);
      setSyncResults({
        updated: 0,
        skipped: 0,
        errors: 1,
        details: [{
          room: room.name,
          oldStatus: room.status,
          error: error.response?.data?.msg || 'Unknown error',
          success: false
        }]
      });
      setSyncMessage(`Error synchronizing room ${room.name} status: ${error.response?.data?.msg || error.message}`);
    } finally {
      setSyncInProgress(false);
    }
  };

  const renderRoomCard = (room) => (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 6,
        },
        ...(room.type?.toLowerCase() === 'public area' && {
          borderLeft: '4px solid #9c27b0',
        })
      }}
      onClick={() => handleRoomCardClick(room)}
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
          {room.type?.toLowerCase() === 'public area' && (
            <Chip
              label="Public Area"
              size="small"
              color="secondary"
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
          <MeetingRoomIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            {room.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography color="textSecondary">
            Type: {getFriendlyRoomName(room.type, hotelChain)}
            {room.type && ` (${room.type})`}
          </Typography>
          <Typography color="textSecondary">
            Floor: {room.floor || 'N/A'}
          </Typography>
          {room.capacity && (
            <Typography color="textSecondary">
              Capacity: {room.capacity}
            </Typography>
          )}
          {room.amenities && room.amenities.length > 0 && (
            <Box>
              <Typography color="textSecondary" variant="body2">
                Amenities:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {Array.isArray(room.amenities) ? (
                  room.amenities.map((amenity, index) => (
                    <Chip 
                      key={index} 
                      label={amenity} 
                      size="small" 
                      variant="outlined" 
                      sx={{ fontSize: '0.7rem' }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No amenities listed
                  </Typography>
                )}
              </Box>
            </Box>
          )}
          {room.description && (
            <Typography color="textSecondary" variant="body2" sx={{ 
              mt: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {room.description}
            </Typography>
          )}
          {room.last_cleaned && (
            <Typography color="textSecondary" variant="body2" sx={{ mt: 1 }}>
              Last Cleaned: {new Date(room.last_cleaned).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      </CardContent>
      {(isManager || auth?.user?.role === 'super_admin' || ['Maintenance', 'Engineering'].includes(auth?.user?.group)) && (
        <CardActions sx={{ justifyContent: 'flex-end', p: 2, mt: 'auto' }}>
          <Tooltip title="Sync room status with tickets">
            <IconButton
              onClick={(e) => syncRoomStatus(room, e)}
              color="info"
              size="small"
              disabled={syncInProgress}
            >
              <SyncIcon />
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              const roomToEdit = {
                ...room,
                type: room.type || ''
              };
              setRoomFormData(roomToEdit);
              setDisplayRoomType(getFriendlyRoomName(roomToEdit.type, hotelChain));
              setOpenDialog(true);
            }}
            color="primary"
            size="small"
            title="Edit Room"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteRoom(room.room_id);
            }}
            color="error"
            size="small"
            title="Delete Room"
          >
            <DeleteIcon />
          </IconButton>
        </CardActions>
      )}
    </Card>
  );

  const renderRoomForm = () => (
    <Dialog 
      open={openDialog} 
      onClose={() => {
        setOpenDialog(false);
        resetForm();
      }}
      maxWidth="md"
      fullWidth
    >
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
          
          <Box>
            <TextField
              label="Room Type Code"
              value={roomFormData.type}
              onChange={handleRoomTypeChange}
              fullWidth
              helperText={getRoomTypeHelperText()}
              inputProps={{
                style: { textTransform: 'uppercase' }
              }}
            />
            {displayRoomType && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Room Type: {displayRoomType}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {hotelChain === 'BWH' ? (
                'Common codes: NQQ1 (Standard Two Queen), NQQ2 (Deluxe Two Queen), NQQ3 (Premium Two Queen)'
              ) : (
                'Common codes: STDO (Standard), TOBR (Two Bedroom), ONBR (One Bedroom)'
              )}
            </Typography>
          </Box>
          
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
              value={roomFormData.status || 'Available'}
              onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
              label="Status"
            >
              {roomStatuses.map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Capacity"
            value={roomFormData.capacity || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || (Number(value) >= 0 && !isNaN(Number(value)))) {
                setRoomFormData({ ...roomFormData, capacity: value });
              }
            }}
            fullWidth
            type="number"
            inputProps={{ min: 0 }}
            helperText="Number of people the room can accommodate"
          />
          
          <Autocomplete
            multiple
            id="amenities-select"
            options={commonAmenities.sort()}
            value={Array.isArray(roomFormData.amenities) ? roomFormData.amenities : []}
            onChange={(event, newValue) => {
              setRoomFormData({ ...roomFormData, amenities: newValue });
            }}
            freeSolo
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  size="small"
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Amenities"
                helperText="Select from common amenities or type and press Enter to add custom ones"
                fullWidth
              />
            )}
            filterSelectedOptions
            autoHighlight
            clearOnBlur
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Description"
            value={roomFormData.description || ''}
            onChange={(e) => setRoomFormData({ ...roomFormData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
          
          <TextField
            label="Last Cleaned"
            type="datetime-local"
            value={formatDateForInput(roomFormData.last_cleaned)}
            onChange={(e) => setRoomFormData({ ...roomFormData, last_cleaned: e.target.value })}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />
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
  );

  // Utility function to calculate time elapsed
  const getTimeElapsed = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const createdDate = new Date(dateString);
    const now = new Date();
    
    // Calculate the time difference in milliseconds
    const diffMs = now - createdDate;
    
    // Convert to days, hours, minutes
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  };

  // Get a color for the pending time based on urgency
  const getPendingTimeColor = (dateString, priority = 'Medium') => {
    if (!dateString) return 'inherit';
    
    const createdDate = new Date(dateString);
    const now = new Date();
    const diffMs = now - createdDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Adjust thresholds based on priority
    const priorityMultiplier = {
      'Critical': 0.5, // Critical items turn red 2x faster
      'High': 0.75,    // High priority items turn red 1.33x faster
      'Medium': 1,     // Standard threshold
      'Low': 1.5       // Low priority items have more grace time
    };
    
    const multiplier = priorityMultiplier[priority] || 1;
    
    if (diffDays >= 7 * multiplier) {
      return 'error.main'; // Red after 7 days (adjusted by priority)
    } else if (diffDays >= 3 * multiplier) {
      return 'warning.main'; // Orange after 3 days (adjusted by priority)
    } else if (diffDays >= 1 * multiplier) {
      return 'info.main'; // Blue after 1 day (adjusted by priority)
    } else {
      return 'success.main'; // Green for recent items
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Room Management</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              {roomStatuses.map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Room Type</InputLabel>
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              label="Room Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              {getUniqueRoomTypes().map(type => (
                <MenuItem key={type} value={type}>
                  {getFriendlyRoomName(type, hotelChain)} ({type})
                </MenuItem>
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

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <Autocomplete
            multiple
            id="amenities-filter"
            options={commonAmenities.sort()}
            value={selectedAmenities}
            onChange={(event, newValue) => {
              setSelectedAmenities(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Amenities"
                size="small"
              />
            )}
            size="small"
            sx={{ width: 250 }}
          />
        </FormControl>
        
        <FormControlLabel
          control={
            <Switch
              checked={hidePublicAreas}
              onChange={(e) => setHidePublicAreas(e.target.checked)}
              color="primary"
            />
          }
          label="Hide Public Areas"
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
      {uploadSuccess && <Alert severity="success" sx={{ mb: 2 }}>{uploadSuccess}</Alert>}
      {syncMessage && <Alert severity={syncResults && syncResults.errors === 0 ? "success" : "info"} sx={{ mb: 2 }}>{syncMessage}</Alert>}

      {selectedProperty ? (
        loading ? (
          <CircularProgress />
        ) : (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">
                Showing {filteredRooms.length} of {rooms.length} rooms
                {selectedStatus !== 'all' && (
                  <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                    (Status: {selectedStatus})
                  </Typography>
                )}
                {selectedType !== 'all' && (
                  <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                    (Type: {getFriendlyRoomName(selectedType, hotelChain)})
                  </Typography>
                )}
                {selectedAmenities.length > 0 && (
                  <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                    (With amenities: {selectedAmenities.join(', ')})
                  </Typography>
                )}
                {hidePublicAreas && (
                  <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                    (Public Areas hidden)
                  </Typography>
                )}
              </Typography>
              {hidePublicAreas && rooms.some(room => room.type?.toLowerCase() === 'public area') && (
                <Typography variant="body2" color="text.secondary">
                  {rooms.filter(room => room.type?.toLowerCase() === 'public area').length} Public Areas hidden
                </Typography>
              )}
            </Box>
            <Grid container spacing={3}>
              {filteredRooms.map((room) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={room.room_id}>
                  {renderRoomCard(room)}
                </Grid>
              ))}
            </Grid>
          </>
        )
      ) : (
        <Alert severity="info">Please select a property to view rooms</Alert>
      )}

      {renderRoomForm()}

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

      {/* Action Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRoom ? `Room Details: ${selectedRoom.name}` : 'Room Details'}
        </DialogTitle>
        <DialogContent>
          {selectedRoom && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Type: {getFriendlyRoomName(selectedRoom.type, hotelChain)} ({selectedRoom.type})
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Status: <Chip 
                  label={selectedRoom.status} 
                  size="small" 
                  color={
                    selectedRoom.status === 'Available' ? 'success' :
                    selectedRoom.status === 'Occupied' ? 'error' :
                    selectedRoom.status === 'Maintenance' ? 'warning' :
                    'default'
                  } 
                />
              </Typography>
              {selectedRoom.floor && (
                <Typography variant="subtitle1" gutterBottom>
                  Floor: {selectedRoom.floor}
                </Typography>
              )}
              {selectedRoom.capacity && (
                <Typography variant="subtitle1" gutterBottom>
                  Capacity: {selectedRoom.capacity}
                </Typography>
              )}
              {selectedRoom.last_cleaned && (
                <Typography variant="subtitle1" gutterBottom>
                  Last Cleaned: {new Date(selectedRoom.last_cleaned).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Create New
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={navigateToTickets}
              startIcon={<AssignmentIcon />}
              fullWidth
            >
              Create Ticket
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={navigateToServiceRequests}
              startIcon={<RoomServiceIcon />}
              fullWidth
            >
              Create Service Request
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Related Tickets
          </Typography>
          
          {loadingRoomData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : roomTickets.length > 0 ? (
            <Paper variant="outlined" sx={{ mb: 3 }}>
              <List dense>
                {roomTickets.map((ticket) => (
                  <ListItem 
                    key={ticket.ticket_id}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {ticket.status !== 'completed' && (
                          <Tooltip title="Time since created">
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, gap: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: '1rem', color: getPendingTimeColor(ticket.created_at, ticket.priority) }} />
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: getPendingTimeColor(ticket.created_at, ticket.priority),
                                  fontWeight: 'bold'
                                }}
                              >
                                {getTimeElapsed(ticket.created_at)}
                              </Typography>
                            </Box>
                          </Tooltip>
                        )}
                        <Chip 
                          label={ticket.status} 
                          size="small" 
                          color={
                            ticket.status === 'open' ? 'error' :
                            ticket.status === 'in progress' ? 'warning' :
                            ticket.status === 'completed' ? 'success' :
                            'default'
                          } 
                        />
                      </Box>
                    }
                    button
                    onClick={() => {
                      setActionDialogOpen(false);
                      navigate(`/tickets/${ticket.ticket_id}`);
                    }}
                  >
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{ticket.title}</Typography>
                          <Chip 
                            label={ticket.priority} 
                            size="small" 
                            color={
                              ticket.priority === 'Critical' ? 'error' :
                              ticket.priority === 'High' ? 'warning' :
                              ticket.priority === 'Medium' ? 'info' :
                              'success'
                            }
                          />
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                            Priority: {ticket.priority} | Category: {ticket.category}
                          </Typography>
                          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                            Created: {new Date(ticket.created_at).toLocaleDateString()} | By: {ticket.created_by_username}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              No tickets found for this room.
            </Typography>
          )}
          
          <Typography variant="h6" gutterBottom>
            Related Tasks
          </Typography>
          
          {loadingRoomData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : roomTasks.length > 0 ? (
            <Paper variant="outlined">
              <List dense>
                {roomTasks.map((task) => (
                  <ListItem 
                    key={task.task_id}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {task.status !== 'completed' && (
                          <Tooltip title="Time since created">
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, gap: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: '1rem', color: getPendingTimeColor(task.created_at, task.priority) }} />
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: getPendingTimeColor(task.created_at, task.priority),
                                  fontWeight: 'bold'
                                }}
                              >
                                {getTimeElapsed(task.created_at)}
                              </Typography>
                            </Box>
                          </Tooltip>
                        )}
                        <Chip 
                          label={task.status} 
                          size="small" 
                          color={
                            task.status === 'pending' ? 'warning' :
                            task.status === 'completed' ? 'success' :
                            'default'
                          } 
                        />
                      </Box>
                    }
                    button
                    onClick={() => {
                      setActionDialogOpen(false);
                      navigate(`/tasks/${task.task_id}`);
                    }}
                  >
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{task.title}</Typography>
                          <Chip 
                            label={task.priority} 
                            size="small" 
                            color={
                              task.priority === 'Critical' ? 'error' :
                              task.priority === 'High' ? 'warning' :
                              task.priority === 'Medium' ? 'info' :
                              'success'
                            }
                          />
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                            Priority: {task.priority} | Assigned to: {task.assigned_to_username || 'Unassigned'}
                          </Typography>
                          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                            {task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'} 
                          </Typography>
                        </React.Fragment>
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Typography color="text.secondary">
              No tasks found for this room.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewRooms;
