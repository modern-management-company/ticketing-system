import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from '../context/AuthContext';
import apiClient from "./apiClient";
import { useLocation, useNavigate } from "react-router-dom";
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
  Select,
  MenuItem,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Grid,
  TableSortLabel,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PropertySwitcher from './PropertySwitcher';
import { useIsMobile } from '../hooks/useIsMobile';
import CloseIcon from '@mui/icons-material/Close';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TableViewIcon from '@mui/icons-material/TableView';
import TicketKanbanBoard from './TicketKanbanBoard';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestoreIcon from '@mui/icons-material/Restore';
import FilterListIcon from '@mui/icons-material/FilterList';

const ViewTickets = () => {
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [properties, setProperties] = useState([]);
  const [managers, setManagers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    category: 'General',
    subcategory: '',
    property_id: '',
    room_id: ''
  });
  const [orderBy, setOrderBy] = useState('ticket_id');
  const [order, setOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('table');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    group: ''
  });
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    subcategories: [],
    groups: []
  });

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const categories = ['General', 'Maintenance', 'Security', 'Housekeeping', 'Other'];
  
  // Define subcategories for each category
  const subcategories = {
    'Maintenance': ['Plumbing', 'Electrical', 'HVAC', 'Structural', 'Appliances', 'Other'],
    'Cleaning': ['Room Cleaning', 'Common Area', 'Deep Cleaning', 'Laundry', 'Other'],
    'Security': ['Access Control', 'Surveillance', 'Incident Report', 'Safety Concern', 'Other'],
    'IT Support': ['Network', 'Hardware', 'Software', 'Account Access', 'Other'],
    'General': ['General Inquiry', 'Feedback', 'Request', 'Complaint', 'Other'],
    'Housekeeping': ['Room Cleaning', 'Common Area', 'Deep Cleaning', 'Laundry', 'Other'],
    'Other': ['General Inquiry', 'Feedback', 'Request', 'Complaint', 'Other']
  };

  const isMobile = useIsMobile();

  // Add this useEffect
  useEffect(() => {
    // If user has assigned properties, use the first one as default
    if (auth?.assigned_properties?.length > 0) {
      const defaultProperty = auth.assigned_properties[0].property_id;
      console.log('Setting default property:', defaultProperty);
      setSelectedProperty(defaultProperty);
    }
  }, [auth]);

  // Modify the existing useEffect
  useEffect(() => {
    if (selectedProperty) {
      console.log('Selected property changed, fetching data...');
      fetchTickets();
      fetchRooms();
      fetchManagers();
      fetchTasks();
    }
  }, [selectedProperty]);

  // Add properties fetching
  useEffect(() => {
    fetchProperties();
  }, []);

  // Check if we're coming from the rooms page with pre-selected room
  useEffect(() => {
    if (location.state?.createTicket) {
      const { propertyId, roomId } = location.state;
      
      // Set the selected property
      if (propertyId) {
        setSelectedProperty(propertyId);
      }
      
      // Pre-populate form data
      if (roomId) {
        setTicketForm(prev => ({
          ...prev,
          room_id: roomId,
          property_id: propertyId
        }));
        
        // Open the dialog after a short delay
        setTimeout(() => {
          setOpenDialog(true);
        }, 300);
      }
      
      // Clear location state immediately
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Add this useEffect after fetchTickets is defined
  useEffect(() => {
    if (tickets.length > 0) {
      // Extract unique categories, subcategories, and groups
      const categories = [...new Set(tickets.map(ticket => ticket.category))];
      const subcategories = [...new Set(tickets.map(ticket => ticket.subcategory).filter(Boolean))];
      const groups = [...new Set(tickets.map(ticket => ticket.created_by_group).filter(Boolean))];
      
      setAvailableFilters({
        categories,
        subcategories,
        groups
      });
    }
  }, [tickets]);

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/properties');
      if (response.data) {
        // Filter only active properties
        const activeProperties = response.data.filter(prop => prop.status === 'active');
        setProperties(activeProperties);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setError('Failed to load properties');
    }
  };

  const fetchTickets = async () => {
    try {
      if (!auth?.token || !selectedProperty) {
        return;
      }
      setLoading(true);
      console.log('Current auth:', JSON.stringify(auth, null, 2));
      console.log('Current user role:', auth.identity?.role);
      console.log('Current user ID:', auth.identity?.user_id);
      
      // Get tickets and task assignments in parallel
      const [ticketsResponse, tasksResponse] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tickets`),
        apiClient.get(`/properties/${selectedProperty}/tasks`)
      ]);
      
      console.log('Tickets response:', JSON.stringify(ticketsResponse.data, null, 2));
      console.log('Tasks response:', JSON.stringify(tasksResponse.data, null, 2));
      
      if (ticketsResponse.data?.tickets) {
        let filteredTickets = ticketsResponse.data.tickets;
        
        // For regular users, only show tickets they created or are assigned to via tasks
        if (auth.identity?.role === 'user') {
          console.log('Filtering tickets for user role');
          console.log('Total tickets before filtering:', filteredTickets.length);
          
          // Get all tasks assigned to the user
          const userTasks = tasksResponse.data?.tasks?.filter(task => 
            task.assigned_to_id === auth.identity.user_id
          ) || [];
          
          // Get ticket IDs from task assignments
          const assignedTicketIds = userTasks
            .filter(task => task.ticket_id) // Only tasks linked to tickets
            .map(task => task.ticket_id);
          
          console.log('User assigned task ticket IDs:', assignedTicketIds);
          
          filteredTickets = filteredTickets.filter(ticket => {
            const isCreator = ticket.user_id === auth.identity.user_id;
            const isAssignedTask = assignedTicketIds.includes(ticket.ticket_id);
            
            console.log(`Ticket ${ticket.ticket_id}:`, {
              ticket_user_id: ticket.user_id,
              auth_user_id: auth.identity.user_id,
              isCreator,
              isAssignedTask,
              shouldShow: isCreator || isAssignedTask
            });
            
            return isCreator || isAssignedTask;
          });
          
          console.log('Filtered tickets:', filteredTickets.length);
        }
        
        setTickets(filteredTickets);
      } else {
        console.warn('No tickets data in response:', ticketsResponse.data);
        setTickets([]);
      }
      setError(null);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || error.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      if (!selectedProperty) return;
      console.log('Fetching rooms for property:', selectedProperty);
      
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      console.log('Rooms response:', response.data);
      
      if (response.data?.rooms) {
        setRooms(response.data.rooms);
      } else {
        console.warn('No rooms data in response:', response.data);
        setRooms([]);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const fetchManagers = async () => {
    try {
      if (!selectedProperty) return;
      const response = await apiClient.get(`/properties/${selectedProperty}/managers`);
      if (response.data?.managers) {
        setManagers(response.data.managers);
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      if (!selectedProperty) return;
      const response = await apiClient.get(`/properties/${selectedProperty}/tasks`);
      if (response.data?.tasks) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const handlePropertyChange = (propertyId) => {
    console.log('Property changed to:', propertyId);
    setSelectedProperty(propertyId);
  };

  const handleCreateOrEdit = async () => {
    try {
      if (isSubmitting) return; // Prevent multiple submissions
      
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }

      // Validate required fields
      if (!ticketForm.title.trim()) {
        setError('Title is required');
        return;
      }
      if (!ticketForm.description.trim()) {
        setError('Description is required');
        return;
      }

      setIsSubmitting(true); // Set submitting state
      const ticketData = {
        ...ticketForm,
        property_id: selectedProperty
      };

      console.log('Creating/Editing ticket with data:', ticketData);

      if (editingTicket) {
        const response = await apiClient.patch(`/tickets/${editingTicket.ticket_id}`, ticketData);
        console.log('Ticket update response:', response.data);
        setMessage('Ticket updated successfully');
      } else {
        const response = await apiClient.post('/tickets', ticketData);
        console.log('Ticket creation response:', response.data);
        if (response.data?.notifications_sent) {
          setMessage('Ticket created successfully. Email notifications have been sent.');
        } else {
          setMessage('Ticket created successfully');
        }
      }
      await fetchTickets();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save ticket:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.msg || error.message || 'Failed to save ticket');
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  const handleOpenDialog = (ticket = null) => {
    if (ticket) {
      setEditingTicket(ticket);
      setTicketForm({
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        category: ticket.category,
        subcategory: ticket.subcategory || '',
        property_id: ticket.property_id,
        room_id: ticket.room_id || ''
      });
    } else {
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }
      setEditingTicket(null);
      setTicketForm({
        title: '',
        description: '',
        priority: 'Low',
        category: 'General',
        subcategory: '',
        property_id: selectedProperty,
        room_id: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTicket(null);
    setTicketForm({
      title: '',
      description: '',
      priority: 'Low',
      category: 'General',
      subcategory: '',
      property_id: selectedProperty || '',
      room_id: ''
    });
    
    // Clear the location state to prevent dialog from reopening on refresh
    if (location.state?.createTicket) {
      window.history.replaceState({}, document.title);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      try {
        setError(null);
        setMessage(null);
        setLoading(true);
        
        const response = await apiClient.delete(`/tickets/${ticketId}`);
        
        if (response.status === 200) {
          setMessage('Ticket deleted successfully');
          setTickets(prevTickets => prevTickets.filter(ticket => ticket.ticket_id !== ticketId));
        }
      } catch (error) {
        console.error('Failed to delete ticket:', error);
        setError(error.response?.data?.msg || 'Failed to delete ticket');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      setError(null);
      setMessage(null);
      
      const response = await apiClient.patch(`/tickets/${ticketId}`, { status: newStatus });
      
      if (response.status === 200) {
        setTickets(prevTickets => prevTickets.map(ticket => 
          ticket.ticket_id === ticketId ? { ...ticket, status: newStatus } : ticket
        ));
        setMessage('Ticket status updated successfully');
      }
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      setError(error.response?.data?.msg || 'Failed to update ticket status');
    }
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortTickets = (tickets) => {
    return [...tickets].sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Special handling for linked tasks sorting
      if (orderBy === 'linked_tasks') {
        const aTasks = tasks.filter(task => task.ticket_id === a.ticket_id).length;
        const bTasks = tasks.filter(task => task.ticket_id === b.ticket_id).length;
        aValue = aTasks;
        bValue = bTasks;
      }

      // Handle string comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (order === 'desc') {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });
  };

  // Add this function to handle clearing filters
  const handleClearFilters = () => {
    setFilters({
      category: '',
      subcategory: '',
      group: ''
    });
  };

  // Add this function to handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    
    // If category changes, reset subcategory if it doesn't belong to the new category
    if (filterType === 'category' && value !== filters.category) {
      const validSubcategories = subcategories[value] || [];
      if (filters.subcategory && !validSubcategories.includes(filters.subcategory)) {
        setFilters(prev => ({
          ...prev,
          subcategory: ''
        }));
      }
    }
  };

  // Update the filteredTickets to include the new filters
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Filter by completion status
      const isCompleted = ticket.status.toLowerCase() === 'completed';
      if (showCompleted !== isCompleted) return false;
      
      // Filter by category
      if (filters.category && ticket.category !== filters.category) return false;
      
      // Filter by subcategory
      if (filters.subcategory && ticket.subcategory !== filters.subcategory) return false;
      
      // Filter by group
      if (filters.group && ticket.created_by_group !== filters.group) return false;
      
      return true;
    });
  }, [tickets, showCompleted, filters]);

  // Add this function to get active filter count
  const getActiveFilterCount = () => {
    return Object.values(filters).filter(Boolean).length;
  };

  const sortRooms = (rooms) => {
    return [...rooms].sort((a, b) => {
      const roomA = a.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const roomB = b.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      const numA = parseInt(roomA);
      const numB = parseInt(roomB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      return roomA.localeCompare(roomB);
    });
  };

  const TicketCard = ({ ticket }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{ticket.title}</Typography>
        <Typography color="textSecondary" gutterBottom>ID: {ticket.ticket_id}</Typography>
        <Typography variant="body2" paragraph>{ticket.description}</Typography>
        
        <Grid container spacing={1} sx={{ mb: 1 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Status</Typography>
            <Chip 
              label={ticket.status}
              color={
                ticket.status.toLowerCase() === 'open' ? 'error' :
                ticket.status.toLowerCase() === 'in progress' ? 'warning' :
                'success'
              }
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Priority</Typography>
            <Chip 
              label={ticket.priority}
              color={
                ticket.priority === 'Critical' ? 'error' :
                ticket.priority === 'High' ? 'warning' :
                ticket.priority === 'Medium' ? 'info' :
                'success'
              }
              size="small"
            />
          </Grid>
        </Grid>

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Room</Typography>
            <Typography variant="body2">
              {ticket.room_name || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Category</Typography>
            <Typography variant="body2">{ticket.category}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Subcategory</Typography>
            <Typography variant="body2">{ticket.subcategory || 'N/A'}</Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2">Created By</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">{ticket.created_by_username}</Typography>
            <Chip 
              label={ticket.created_by_group || 'N/A'} 
              variant="outlined"
              size="small"
              color="primary"
            />
          </Box>
        </Box>
      </CardContent>
      <CardActions>
        <Button
          startIcon={<EditIcon />}
          onClick={() => handleOpenDialog(ticket)}
          size="small"
        >
          Edit
        </Button>
        {(auth?.user?.role === 'super_admin') && (
          <Button
            startIcon={<DeleteIcon />}
            onClick={() => handleDeleteTicket(ticket.ticket_id)}
            size="small"
            color="error"
          >
            Delete
          </Button>
        )}
      </CardActions>
    </Card>
  );

  // Add this right before the main return statement
  const FilterDialog = () => (
    <Dialog
      open={openFilterDialog}
      onClose={() => setOpenFilterDialog(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        Filter Tickets
        <IconButton
          aria-label="close"
          onClick={() => setOpenFilterDialog(false)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              label="Category"
            >
              <MenuItem value="">
                <em>All Categories</em>
              </MenuItem>
              {availableFilters.categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth disabled={!filters.category}>
            <InputLabel>Subcategory</InputLabel>
            <Select
              value={filters.subcategory}
              onChange={(e) => handleFilterChange('subcategory', e.target.value)}
              label="Subcategory"
            >
              <MenuItem value="">
                <em>All Subcategories</em>
              </MenuItem>
              {filters.category && subcategories[filters.category]?.map((subcategory) => (
                <MenuItem key={subcategory} value={subcategory}>
                  {subcategory}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>User Group</InputLabel>
            <Select
              value={filters.group}
              onChange={(e) => handleFilterChange('group', e.target.value)}
              label="User Group"
            >
              <MenuItem value="">
                <em>All Groups</em>
              </MenuItem>
              {availableFilters.groups.map((group) => (
                <MenuItem key={group} value={group}>
                  {group}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClearFilters} color="secondary">
          Clear Filters
        </Button>
        <Button 
          onClick={() => setOpenFilterDialog(false)} 
          variant="contained" 
          color="primary"
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">
            {showCompleted ? 'Completed Tickets' : 'Active Tickets'}
          </Typography>
          <ToggleButtonGroup
            value={showCompleted}
            exclusive
            onChange={(e, value) => setShowCompleted(value)}
            size="small"
          >
            <ToggleButton value={false}>
              <Tooltip title="View Active Tickets">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon />
                  Active
                </Box>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value={true}>
              <Tooltip title="View Completed Tickets">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon />
                  Completed
                </Box>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <PropertySwitcher onPropertyChange={handlePropertyChange} />
          <Tooltip title="Filter Tickets">
            <Button
              variant={getActiveFilterCount() > 0 ? "contained" : "outlined"}
              color="secondary"
              startIcon={<FilterListIcon />}
              onClick={() => setOpenFilterDialog(true)}
              sx={getActiveFilterCount() > 0 ? { borderRadius: 2 } : {}}
            >
              Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
            </Button>
          </Tooltip>
          {!showCompleted && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={!selectedProperty}
            >
              Create Ticket
            </Button>
          )}
          <Tooltip title={viewMode === 'table' ? 'Switch to Kanban View' : 'Switch to Table View'}>
            <IconButton onClick={() => setViewMode(viewMode === 'table' ? 'kanban' : 'table')}>
              {viewMode === 'table' ? <ViewWeekIcon /> : <TableViewIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {/* Show active filters */}
      {getActiveFilterCount() > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {filters.category && (
            <Chip
              label={`Category: ${filters.category}`}
              onDelete={() => handleFilterChange('category', '')}
              color="primary"
              variant="outlined"
            />
          )}
          {filters.subcategory && (
            <Chip
              label={`Subcategory: ${filters.subcategory}`}
              onDelete={() => handleFilterChange('subcategory', '')}
              color="primary"
              variant="outlined"
            />
          )}
          {filters.group && (
            <Chip
              label={`Group: ${filters.group}`}
              onDelete={() => handleFilterChange('group', '')}
              color="primary"
              variant="outlined"
            />
          )}
          <Chip
            label="Clear All Filters"
            onClick={handleClearFilters}
            color="secondary"
          />
        </Box>
      )}

      {!selectedProperty ? (
        <Alert severity="info">Please select a property to view tickets</Alert>
      ) : loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {viewMode === 'kanban' ? (
            <TicketKanbanBoard
              tickets={filteredTickets}
              onTicketMove={(ticketId, newStatus) => handleStatusChange(ticketId, newStatus)}
              onEditTicket={handleOpenDialog}
              onDeleteTicket={handleDeleteTicket}
              canEdit={auth?.user?.role === 'super_admin' || managers.some(m => m.user_id === auth?.user?.user_id)}
            />
          ) : isMobile ? (
            <Box sx={{ mt: 2 }}>
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <TicketCard key={ticket.ticket_id} ticket={ticket} />
                ))
              ) : (
                <Alert severity="info">No tickets match the selected filters</Alert>
              )}
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'ticket_id'}
                        direction={orderBy === 'ticket_id' ? order : 'asc'}
                        onClick={() => handleRequestSort('ticket_id')}
                      >
                        ID
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'title'}
                        direction={orderBy === 'title' ? order : 'asc'}
                        onClick={() => handleRequestSort('title')}
                      >
                        Title
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'description'}
                        direction={orderBy === 'description' ? order : 'asc'}
                        onClick={() => handleRequestSort('description')}
                      >
                        Description
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'room_name'}
                        direction={orderBy === 'room_name' ? order : 'asc'}
                        onClick={() => handleRequestSort('room_name')}
                      >
                        Room
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'status'}
                        direction={orderBy === 'status' ? order : 'asc'}
                        onClick={() => handleRequestSort('status')}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'priority'}
                        direction={orderBy === 'priority' ? order : 'asc'}
                        onClick={() => handleRequestSort('priority')}
                      >
                        Priority
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'category'}
                        direction={orderBy === 'category' ? order : 'asc'}
                        onClick={() => handleRequestSort('category')}
                      >
                        Category
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'subcategory'}
                        direction={orderBy === 'subcategory' ? order : 'asc'}
                        onClick={() => handleRequestSort('subcategory')}
                      >
                        Subcategory
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'created_by_username'}
                        direction={orderBy === 'created_by_username' ? order : 'asc'}
                        onClick={() => handleRequestSort('created_by_username')}
                      >
                        Created By
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'created_by_group'}
                        direction={orderBy === 'created_by_group' ? order : 'asc'}
                        onClick={() => handleRequestSort('created_by_group')}
                      >
                        Group
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'created_at'}
                        direction={orderBy === 'created_at' ? order : 'asc'}
                        onClick={() => handleRequestSort('created_at')}
                      >
                        Created At
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'linked_tasks'}
                        direction={orderBy === 'linked_tasks' ? order : 'asc'}
                        onClick={() => handleRequestSort('linked_tasks')}
                      >
                        Linked Tasks
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTickets.length > 0 ? (
                    sortTickets(filteredTickets).map((ticket) => (
                      <TableRow key={ticket.ticket_id}>
                        <TableCell>
                          <Button
                            onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                            sx={{ textTransform: 'none', minWidth: 'auto' }}
                          >
                            {ticket.ticket_id}
                          </Button>
                        </TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>{ticket.description}</TableCell>
                        <TableCell>
                          {ticket.room_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ticket.status}
                            color={
                              ticket.status.toLowerCase() === 'open' ? 'error' :
                              ticket.status.toLowerCase() === 'in progress' ? 'warning' :
                              'success'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ticket.priority}
                            color={
                              ticket.priority === 'Critical' ? 'error' :
                              ticket.priority === 'High' ? 'warning' :
                              ticket.priority === 'Medium' ? 'info' :
                              'success'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ticket.category}
                            variant="outlined"
                            onClick={() => handleFilterChange('category', ticket.category)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell>
                          {ticket.subcategory ? (
                            <Chip 
                              label={ticket.subcategory} 
                              variant="outlined"
                              onClick={() => {
                                handleFilterChange('category', ticket.category);
                                handleFilterChange('subcategory', ticket.subcategory);
                              }}
                              sx={{ cursor: 'pointer' }}
                            />
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>{ticket.created_by_username}</TableCell>
                        <TableCell>
                          {ticket.created_by_group ? (
                            <Chip 
                              label={ticket.created_by_group} 
                              variant="outlined"
                              size="small"
                              color="primary"
                              onClick={() => handleFilterChange('group', ticket.created_by_group)}
                              sx={{ cursor: 'pointer' }}
                            />
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(ticket.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const linkedTasks = tasks.filter(task => task.ticket_id === ticket.ticket_id);
                            return linkedTasks.length > 0 ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Chip 
                                  label={`${linkedTasks.length} Task${linkedTasks.length > 1 ? 's' : ''}`}
                                  color="primary"
                                  size="small"
                                  onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                                  sx={{ cursor: 'pointer' }}
                                />
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {linkedTasks.map(task => (
                                    <Chip
                                      key={task.task_id}
                                      label={`#${task.task_id}`}
                                      size="small"
                                      variant="outlined"
                                      onClick={() => navigate(`/tasks/${task.task_id}`)}
                                      sx={{ cursor: 'pointer' }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="textSecondary">No tasks</Typography>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {!showCompleted ? (
                              <>
                                <Button
                                  startIcon={<EditIcon />}
                                  onClick={() => handleOpenDialog(ticket)}
                                  size="small"
                                >
                                  Edit
                                </Button>
                                <Button
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleStatusChange(ticket.ticket_id, 'completed')}
                                  size="small"
                                  color="success"
                                >
                                  Mark Complete
                                </Button>
                                {(auth?.user?.role === 'super_admin') && (
                                  <Button
                                    startIcon={<DeleteIcon />}
                                    onClick={() => handleDeleteTicket(ticket.ticket_id)}
                                    size="small"
                                    color="error"
                                  >
                                    Delete
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button
                                startIcon={<RestoreIcon />}
                                onClick={() => handleStatusChange(ticket.ticket_id, 'open')}
                                size="small"
                                color="primary"
                              >
                                Reopen
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} align="center">
                        <Typography variant="body1" sx={{ py: 2 }}>
                          No tickets match the selected filters
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Render the filter dialog */}
      <FilterDialog />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTicket ? 'Edit Ticket' : 'Create New Ticket'}
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <Typography variant="subtitle1" color="textSecondary">
              Property: {properties.find(p => p.property_id === selectedProperty)?.name || 'No property selected'}
            </Typography>
            <TextField
              label="Title"
              value={ticketForm.title}
              onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={ticketForm.description}
              onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              multiline
              rows={4}
              fullWidth
              required
            />
            <Autocomplete
              options={sortRooms(rooms)}
              getOptionLabel={(option) => option.name || ''}
              value={rooms.find(room => room.room_id === ticketForm.room_id) || null}
              onChange={(event, newValue) => {
                setTicketForm({
                  ...ticketForm,
                  room_id: newValue?.room_id || '',
                  property_id: selectedProperty
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Room"
                  required
                  error={!ticketForm.room_id}
                />
              )}
              isOptionEqualToValue={(option, value) => option.room_id === value.room_id}
              freeSolo={false}
              autoSelect
              autoComplete
              clearOnBlur={false}
              filterOptions={(options, { inputValue }) => {
                // Custom filter to match room numbers
                const filtered = options.filter(option =>
                  option.name.toLowerCase().includes(inputValue.toLowerCase())
                );
                return filtered;
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                label="Priority"
              >
                {priorities.map((priority) => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={ticketForm.category}
                onChange={(e) => setTicketForm({ 
                  ...ticketForm, 
                  category: e.target.value,
                  subcategory: '' // Reset subcategory when category changes
                })}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Subcategory</InputLabel>
              <Select
                value={ticketForm.subcategory}
                onChange={(e) => setTicketForm({ ...ticketForm, subcategory: e.target.value })}
                label="Subcategory"
                disabled={!ticketForm.category}
              >
                {subcategories[ticketForm.category]?.map((subcategory) => (
                  <MenuItem key={subcategory} value={subcategory}>{subcategory}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancel</Button>
          <Button 
            onClick={handleCreateOrEdit} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : (editingTicket ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewTickets;