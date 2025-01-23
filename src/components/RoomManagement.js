const RoomManagement = () => {
  const { auth } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [editRoom, setEditRoom] = useState(null);
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: '',
    floor: '',
    status: 'Available'
  });

  const roomTypes = ['Single', 'Double', 'Suite', 'Conference', 'Other'];
  const roomStatuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning'];

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/properties');
      setProperties(response.data.properties);
      if (response.data.properties.length > 0) {
        setSelectedProperty(response.data.properties[0].property_id);
      }
    } catch (error) {
      setError('Failed to fetch properties');
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedProperty]);

  const fetchRooms = async () => {
    if (!selectedProperty) return;
    try {
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      setRooms(response.data.rooms);
    } catch (error) {
      setError('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!selectedProperty) {
      setError('Please select a property');
      return;
    }

    try {
      await apiClient.post(`/properties/${selectedProperty}/rooms`, newRoom);
      setMessage('Room added successfully');
      setNewRoom({ name: '', type: '', floor: '', status: 'Available' });
      fetchRooms();
    } catch (error) {
      setError('Failed to add room');
    }
  };

  const handleUpdateRoom = async (roomId) => {
    try {
      await apiClient.patch(`/rooms/${roomId}`, editRoom);
      setMessage('Room updated successfully');
      setEditRoom(null);
      fetchRooms();
    } catch (error) {
      setError('Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await apiClient.delete(`/rooms/${roomId}`);
      setMessage('Room deleted successfully');
      fetchRooms();
    } catch (error) {
      setError('Failed to delete room');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Room Management</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      {/* Add New Room Form */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Add New Room</Typography>
        <form onSubmit={handleAddRoom}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Room Name"
                value={newRoom.name}
                onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth required>
                <InputLabel>Room Type</InputLabel>
                <Select
                  value={newRoom.type}
                  onChange={(e) => setNewRoom({...newRoom, type: e.target.value})}
                >
                  {roomTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Floor"
                type="number"
                value={newRoom.floor}
                onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 1 }}
              >
                Add Room
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Rooms List */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Floor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.room_id}>
                <TableCell>
                  {editRoom?.room_id === room.room_id ? (
                    <TextField
                      value={editRoom.name}
                      onChange={(e) => setEditRoom({...editRoom, name: e.target.value})}
                    />
                  ) : (
                    room.name
                  )}
                </TableCell>
                <TableCell>
                  {editRoom?.room_id === room.room_id ? (
                    <Select
                      value={editRoom.type}
                      onChange={(e) => setEditRoom({...editRoom, type: e.target.value})}
                    >
                      {roomTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  ) : (
                    room.type
                  )}
                </TableCell>
                <TableCell>
                  {editRoom?.room_id === room.room_id ? (
                    <TextField
                      type="number"
                      value={editRoom.floor}
                      onChange={(e) => setEditRoom({...editRoom, floor: e.target.value})}
                    />
                  ) : (
                    room.floor
                  )}
                </TableCell>
                <TableCell>
                  {editRoom?.room_id === room.room_id ? (
                    <Select
                      value={editRoom.status}
                      onChange={(e) => setEditRoom({...editRoom, status: e.target.value})}
                    >
                      {roomStatuses.map(status => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  ) : (
                    room.status
                  )}
                </TableCell>
                <TableCell>
                  {editRoom?.room_id === room.room_id ? (
                    <>
                      <IconButton onClick={() => handleUpdateRoom(room.room_id)} color="primary">
                        <SaveIcon />
                      </IconButton>
                      <IconButton onClick={() => setEditRoom(null)}>
                        <CancelIcon />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton onClick={() => setEditRoom(room)} color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteRoom(room.room_id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}; 