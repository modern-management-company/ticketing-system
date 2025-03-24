import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogContent,
  Autocomplete,
  FormControlLabel,
  Switch
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PropertySwitcher from './PropertySwitcher';
import { Chip } from '@mui/material';
import { toast } from 'react-hot-toast';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const Reports = () => {
  const { auth } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [rooms, setRooms] = useState([]);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({
    tickets: [],
    tasks: [],
    requests: []
  });
  const [properties, setProperties] = useState([]);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [reportType, setReportType] = useState('tickets');

  useEffect(() => {
    fetchProperties();
  }, []);

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

  const fetchRooms = async () => {
    if (!selectedProperty) return;
    
    try {
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      if (response.data && Array.isArray(response.data.rooms)) {
        setRooms(response.data.rooms);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setError('Failed to load rooms');
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      fetchRooms();
    }
  }, [selectedProperty]);

  useEffect(() => {
    if (selectedProperty && selectedDate) {
      fetchReportData();
    }
  }, [selectedProperty, selectedDate, selectedRoom, hideCompleted]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      const [ticketsRes, requestsRes, tasksRes] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tickets?date=${formattedDate}`),
        apiClient.get(`/service-requests?property_id=${selectedProperty}`),
        apiClient.get(`/properties/${selectedProperty}/tasks?date=${formattedDate}`)
      ]);

      let allTickets = ticketsRes.data?.tickets || [];
      let allRequests = requestsRes.data?.requests || [];
      let allTasks = tasksRes.data?.tasks || [];

      // Filter out completed items if hideCompleted is true
      if (hideCompleted) {
        allTickets = allTickets.filter(ticket => 
          ticket.status.toLowerCase() !== 'completed'
        );
        allRequests = allRequests.filter(request => 
          request.status.toLowerCase() !== 'completed'
        );
        allTasks = allTasks.filter(task => 
          task.status.toLowerCase() !== 'completed'
        );
      }
      
      // Apply room filtering if a specific room is selected
      if (selectedRoom !== 'all') {
        allTickets = allTickets.filter(ticket => 
          ticket.room_id === selectedRoom || 
          ticket.room?.room_id === selectedRoom ||
          ticket.room_number === selectedRoom
        );
        
        allRequests = allRequests.filter(request => 
          request.room_id === selectedRoom || 
          request.room?.room_id === selectedRoom ||
          request.room_number === selectedRoom
        );
        
        const ticketIds = new Set(allTickets.map(t => t.ticket_id));
        const requestIds = new Set(allRequests.map(r => r.request_id));
        
        allTasks = allTasks.filter(task => 
          (task.ticket_id && ticketIds.has(task.ticket_id)) ||
          (task.request_id && requestIds.has(task.request_id))
        );
      }

      setReportData({
        tickets: allTickets,
        tasks: allTasks,
        requests: allRequests
      });
    } catch (error) {
      setError('Failed to fetch report data');
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const generatePDF = (type) => {
    const doc = new jsPDF();
    const property = properties.find(p => p.property_id === selectedProperty);
    const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${property?.name}`;
    const date = format(selectedDate, 'MMMM dd, yyyy');

    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(12);
    doc.text(`Date: ${date}`, 14, 25);

    // Add table
    const data = reportData[type].map(item => {
      if (type === 'tickets') {
        return [
          item.ticket_id,
          item.title,
          item.room_name || 'N/A',
          item.status,
          item.priority,
          item.created_by_username,
          format(new Date(item.created_at), 'MM/dd/yyyy HH:mm')
        ];
      } else if (type === 'tasks') {
        return [
          item.task_id,
          item.title,
          item.status,
          item.priority,
          item.assigned_to || 'Unassigned',
          item.due_date ? format(new Date(item.due_date), 'MM/dd/yyyy') : 'No due date'
        ];
      } else if (type === 'requests') {
        return [
          item.request_id,
          item.request_type,
          item.room_number || 'N/A',
          item.request_group,
          item.status,
          item.priority,
          item.guest_name || 'N/A',
          format(new Date(item.created_at), 'MM/dd/yyyy HH:mm')
        ];
      }
    });

    const columns = type === 'tickets' 
      ? ['ID', 'Title', 'Room', 'Status', 'Priority', 'Created By', 'Created At']
      : type === 'tasks'
      ? ['ID', 'Title', 'Status', 'Priority', 'Assigned To', 'Due Date']
      : ['ID', 'Type', 'Room', 'Group', 'Status', 'Priority', 'Guest', 'Created At'];

    doc.autoTable({
      head: [columns],
      body: data,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    // Save PDF
    doc.save(`${type}_report_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
  };

  const handleSendEmail = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/api/reports/send-email', {
        property_id: selectedProperty,
        date: format(selectedDate, 'yyyy-MM-dd'),
        type: reportType
      });

      if (response.data && response.data.success) {
        toast.success('Report sent to your email successfully');
      } else {
        throw new Error(response.data?.message || 'Failed to send report email');
      }
    } catch (error) {
      console.error('Error sending report email:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send report email';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <PropertySwitcher onPropertyChange={setSelectedProperty} />
        </Grid>
        <Grid item xs={12} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <TextField
              fullWidth
              value={format(selectedDate, 'MM/dd/yyyy')}
              onClick={() => setOpenDatePicker(true)}
              label="Select Date"
              inputProps={{ readOnly: true }}
            />
            <Dialog open={openDatePicker} onClose={() => setOpenDatePicker(false)}>
              <DialogContent>
                <StaticDatePicker
                  displayStaticWrapperAs="desktop"
                  value={selectedDate}
                  onChange={(newValue) => {
                    setSelectedDate(newValue);
                    setOpenDatePicker(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </LocalizationProvider>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Filter by Room</InputLabel>
            <Select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              label="Filter by Room"
              disabled={!selectedProperty || rooms.length === 0}
            >
              <MenuItem value="all">All Rooms</MenuItem>
              {rooms.map((room) => (
                <MenuItem key={room.room_id} value={room.room_id}>
                  {room.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={hideCompleted}
                  onChange={(e) => setHideCompleted(e.target.checked)}
                  color="primary"
                />
              }
              label="Hide Completed Items"
            />
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">
              Active Filters:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {selectedRoom !== 'all' && (
                <Chip
                  label={`Room: ${rooms.find(r => r.room_id === selectedRoom)?.name || selectedRoom}`}
                  onDelete={() => setSelectedRoom('all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {hideCompleted && (
                <Chip
                  label="Hiding Completed Items"
                  onDelete={() => setHideCompleted(false)}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="h6">
              Active Tickets: {reportData.tickets.length}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="h6">
              Active Service Requests: {reportData.requests.length}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="h6">
              Active Tasks: {reportData.tasks.length}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Tickets Report" />
          <Tab label="Tasks Report" />
          <Tab label="Service Requests Report" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    generatePDF('tickets');
                    setReportType('tickets');
                  }}
                  disabled={!reportData.tickets.length}
                >
                  Generate PDF
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleSendEmail}
                  disabled={!reportData.tickets.length || loading}
                >
                  {loading ? 'Sending...' : 'Send to Email'}
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Room</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Created By</TableCell>
                      <TableCell>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.tickets.map((ticket) => (
                      <TableRow key={ticket.ticket_id}>
                        <TableCell>{ticket.ticket_id}</TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>{ticket.room_name || 'N/A'}</TableCell>
                        <TableCell>{ticket.status}</TableCell>
                        <TableCell>{ticket.priority}</TableCell>
                        <TableCell>{ticket.created_by_username}</TableCell>
                        <TableCell>
                          {format(new Date(ticket.created_at), 'MM/dd/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    generatePDF('tasks');
                    setReportType('tasks');
                  }}
                  disabled={!reportData.tasks.length}
                >
                  Generate PDF
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleSendEmail}
                  disabled={!reportData.tasks.length || loading}
                >
                  {loading ? 'Sending...' : 'Send to Email'}
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Related To</TableCell>
                      <TableCell>Due Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.tasks.map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell>{task.task_id}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.status}</TableCell>
                        <TableCell>{task.priority}</TableCell>
                        <TableCell>{task.assigned_to || 'Unassigned'}</TableCell>
                        <TableCell>
                          {task.related_type === 'ticket' ? (
                            `Ticket #${task.related_id}`
                          ) : task.related_type === 'service_request' ? (
                            `Service Request #${task.related_id}`
                          ) : (
                            'None'
                          )}
                        </TableCell>
                        <TableCell>
                          {task.due_date ? format(new Date(task.due_date), 'MM/dd/yyyy') : 'No due date'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    generatePDF('requests');
                    setReportType('requests');
                  }}
                  disabled={!reportData.requests.length}
                >
                  Generate PDF
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleSendEmail}
                  disabled={!reportData.requests.length || loading}
                >
                  {loading ? 'Sending...' : 'Send to Email'}
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Room</TableCell>
                      <TableCell>Group</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Guest</TableCell>
                      <TableCell>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.requests.map((request) => (
                      <TableRow key={request.request_id}>
                        <TableCell>{request.request_id}</TableCell>
                        <TableCell>{request.request_type}</TableCell>
                        <TableCell>{request.room_number || 'N/A'}</TableCell>
                        <TableCell>{request.request_group}</TableCell>
                        <TableCell>{request.status}</TableCell>
                        <TableCell>{request.priority}</TableCell>
                        <TableCell>{request.guest_name || 'N/A'}</TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), 'MM/dd/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Reports; 