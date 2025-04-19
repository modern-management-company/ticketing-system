import React, { useState, useEffect } from 'react';
import { fetchTicketHistory, fetchTaskHistory, getCompletedInfo } from './historyHelpers';
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
  Switch,
  Chip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PropertySwitcher from './PropertySwitcher';
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
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date()
  });
  const [openDateRangePicker, setOpenDateRangePicker] = useState(false);

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

      const formattedStartDate = format(dateRange.start, 'yyyy-MM-dd');
      const formattedEndDate = format(dateRange.end, 'yyyy-MM-dd');
      
      // Fetch all data without room filtering
      const [ticketsRes, requestsRes, tasksRes] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tickets?start_date=${formattedStartDate}&end_date=${formattedEndDate}`),
        apiClient.get(`/service-requests?property_id=${selectedProperty}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`),
        apiClient.get(`/properties/${selectedProperty}/tasks?start_date=${formattedStartDate}&end_date=${formattedEndDate}`)
      ]);

      let allTickets = ticketsRes.data?.tickets || [];
      let allRequests = requestsRes.data?.requests || [];
      let allTasks = tasksRes.data?.tasks || [];

      // Filter out completed items if hideCompleted is true
      if (hideCompleted) {
        allTickets = allTickets.filter(ticket => 
          ticket?.status?.toLowerCase() !== 'completed'
        );
        allRequests = allRequests.filter(request => 
          request?.status?.toLowerCase() !== 'completed'
        );
        allTasks = allTasks.filter(task => 
          task?.status?.toLowerCase() !== 'completed'
        );
      }

      // Fetch and attach completion info for tickets and tasks
      // (Do this in parallel for performance)
      const ticketWithHistory = await Promise.all(
        allTickets.map(async (ticket) => {
          const history = await fetchTicketHistory(ticket.ticket_id);
          console.log('Ticket', ticket.ticket_id, 'history:', history);
          const { completedBy, completedAt } = getCompletedInfo(history);
          return {
            ...ticket,
            completed_by: completedBy,
            completed_at: completedAt,
            history: history.map(h => ({
              action: h.action,
              user: h.user_name || h.user || 'Unknown',
              timestamp: h.created_at || h.timestamp,
              old_status: h.old_value,
              new_status: h.new_value,
            }))
          };
        })
      );

      // Only declare taskWithHistory once (with debug logging)
      const taskWithHistory = await Promise.all(
        allTasks.map(async (task) => {
          const history = await fetchTaskHistory(task.task_id);
          console.log('Task', task.task_id, 'history:', history);
          const { completedBy, completedAt } = getCompletedInfo(history);
          return {
            ...task,
            completed_by: completedBy,
            completed_at: completedAt,
            history: history.map(h => ({
              action: h.action,
              user: h.user_name || h.user || 'Unknown',
              timestamp: h.created_at || h.timestamp,
              old_status: h.old_value,
              new_status: h.new_value,
            }))
          };
        })
      );


      console.log('Raw data fetched:', {
        tickets: ticketWithHistory.length,
        requests: allRequests.length,
        tasks: taskWithHistory.length
      });
      
      // Apply client-side filtering if a room is selected
      if (selectedRoom !== 'all') {
        console.log('Filtering by room:', selectedRoom);
        
        // Filter tickets by room
        allTickets = allTickets.filter(ticket => {
          return ticket.room_id === selectedRoom || 
                 ticket.room?.room_id === selectedRoom ||
                 ticket.room_number === selectedRoom;
        });
        
        // Filter service requests by room
        allRequests = allRequests.filter(request => {
          return request.room_id === selectedRoom || 
                 request.room?.room_id === selectedRoom ||
                 request.room_number === selectedRoom;
        });
        
        console.log('Filtered tickets and requests:', {
          filteredTickets: allTickets.length,
          filteredRequests: allRequests.length
        });
        
        // Filter tasks based on their relation to filtered tickets and requests
        const ticketIds = new Set(allTickets.map(t => t.ticket_id));
        const requestIds = new Set(allRequests.map(r => r.request_id));
        
        // Keep only tasks related to the filtered tickets/requests
        allTasks = allTasks.filter(task => {
          return (task.ticket_id && ticketIds.has(task.ticket_id)) ||
                 (task.request_id && requestIds.has(task.request_id));
        });
        
        console.log('Filtered tasks:', allTasks.length);
      }

      setReportData({
        tickets: ticketWithHistory || [],
        tasks: taskWithHistory || [],
        requests: allRequests || []
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
          format(new Date(item.created_at), 'MM/dd/yyyy HH:mm'),
          item.completed_at ? format(new Date(item.completed_at), 'MM/dd/yyyy HH:mm') : 'N/A',
          item.completed_by || 'N/A'
        ];
      } else if (type === 'tasks') {
        return [
          item.task_id,
          item.title,
          item.room_info?.room_name || 'N/A',
          item.status,
          item.priority,
          item.assigned_to || 'Unassigned',
          item.ticket_id ? `Ticket #${item.ticket_id}` : 'None',
          item.due_date ? format(new Date(item.due_date), 'MM/dd/yyyy') : 'No due date',
          item.completed_at ? format(new Date(item.completed_at), 'MM/dd/yyyy HH:mm') : 'N/A',
          item.completed_by || 'N/A'
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
      ? ['ID', 'Title', 'Room', 'Status', 'Priority', 'Created By', 'Created At', 'Completed At', 'Completed By']
      : type === 'tasks'
      ? ['ID', 'Title', 'Room', 'Status', 'Priority', 'Assigned To', 'Linked To', 'Due Date', 'Completed At', 'Completed By']
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

  const fetchUsers = async () => {
    if (!selectedProperty) return;
    try {
      const response = await apiClient.get(`/properties/${selectedProperty}/users`);
      if (response.data) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users');
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      fetchUsers();
    }
  }, [selectedProperty]);

  const handleSendEmail = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/api/reports/send-email', {
        property_id: selectedProperty,
        date: format(selectedDate, 'yyyy-MM-dd'),
        type: reportType,
        user_ids: selectedUsers.map(user => user.user_id)
      });

      if (response.data && response.data.success) {
        toast.success('Report sent successfully');
        setOpenEmailDialog(false);
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
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Date Range
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                fullWidth
                value={`${format(dateRange.start, 'MM/dd/yyyy')} - ${format(dateRange.end, 'MM/dd/yyyy')}`}
                onClick={() => setOpenDateRangePicker(true)}
                label="Select Date Range"
                inputProps={{ readOnly: true }}
              />
              <Dialog open={openDateRangePicker} onClose={() => setOpenDateRangePicker(false)}>
                <DialogContent>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <StaticDatePicker
                      displayStaticWrapperAs="desktop"
                      value={dateRange.start}
                      onChange={(newValue) => {
                        setDateRange(prev => ({ ...prev, start: newValue }));
                      }}
                      renderInput={(params) => <TextField {...params} />}
                    />
                    <StaticDatePicker
                      displayStaticWrapperAs="desktop"
                      value={dateRange.end}
                      onChange={(newValue) => {
                        setDateRange(prev => ({ ...prev, end: newValue }));
                      }}
                      renderInput={(params) => <TextField {...params} />}
                    />
                  </LocalizationProvider>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={() => setOpenDateRangePicker(false)}>Cancel</Button>
                    <Button
                      variant="contained"
                      onClick={() => {
                        setOpenDateRangePicker(false);
                        fetchReportData();
                      }}
                    >
                      Apply
                    </Button>
                  </Box>
                </DialogContent>
              </Dialog>
            </Box>
          </Paper>
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
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
              <Typography variant="h6" color="primary">
                Active Tickets: {reportData.tickets?.length || 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, bgcolor: '#f3e5f5' }}>
              <Typography variant="h6" color="secondary">
                Active Service Requests: {reportData.requests?.length || 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
              <Typography variant="h6" color="success.main">
                Active Tasks: {reportData.tasks?.length || 0}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
                  disabled={!reportData.tickets?.length}
                >
                  Generate PDF
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setOpenEmailDialog(true)}
                  disabled={!reportData.tickets?.length}
                >
                  Send to Email
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
                      <TableCell>Completed At</TableCell>
                      <TableCell>History</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(reportData.tickets || []).map((ticket) => (
                      <TableRow key={ticket.ticket_id}>
                        <TableCell>{ticket.ticket_id}</TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>{ticket.room_name || 'N/A'}</TableCell>
                        <TableCell>{ticket.status}</TableCell>
                        <TableCell>{ticket.priority}</TableCell>
                        <TableCell>{ticket.created_by}</TableCell>
                        <TableCell>
                          {ticket.created_at ? format(new Date(ticket.created_at), 'MM/dd/yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {ticket.completed_at ? format(new Date(ticket.completed_at), 'MM/dd/yyyy HH:mm') : 'N/A'}
                          <br />
                          {ticket.completed_by && (
                            <span style={{fontSize: '0.8em', color: '#666'}}>by {ticket.completed_by}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ maxHeight: '100px', overflow: 'auto' }}>
                            {(ticket.history || []).map((h, index) => (
                              <Box key={index} sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                  {h.action === 'created' && `Created by ${h.user} at ${format(new Date(h.timestamp), 'MM/dd/yyyy HH:mm')}`}
                                  {h.action === 'status_changed' && `Status changed from ${h.old_status} to ${h.new_status} by ${h.user} at ${format(new Date(h.timestamp), 'MM/dd/yyyy HH:mm')}`}
                                  {h.action === 'completed' && `Completed by ${h.user} at ${format(new Date(h.timestamp), 'MM/dd/yyyy HH:mm')}`}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
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
                  disabled={!reportData.tasks?.length}
                >
                  Generate PDF
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setOpenEmailDialog(true)}
                  disabled={!reportData.tasks?.length}
                >
                  Send to Email
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
                      <TableCell>Current Assignee</TableCell>
                      <TableCell>Created At</TableCell>
                      <TableCell>Completed At</TableCell>
                      <TableCell>History</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(reportData.tasks || []).map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell>{task.task_id}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.room_info?.room_name || 'N/A'}</TableCell>
                        <TableCell>{task.status}</TableCell>
                        <TableCell>{task.priority}</TableCell>
                        <TableCell>{task.current_assigned_to}</TableCell>
                        <TableCell>
                          {task.created_at ? format(new Date(task.created_at), 'MM/dd/yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {task.completed_at ? format(new Date(task.completed_at), 'MM/dd/yyyy HH:mm') : 'N/A'}
                          <br />
                          {task.completed_by && (
                            <span style={{fontSize: '0.8em', color: '#666'}}>by {task.completed_by}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ maxHeight: '100px', overflow: 'auto' }}>
                            {(task.history || []).map((h, index) => (
                              <Box key={index} sx={{ mb: 1 }}>
                                {h.assigned_to && (
                                  <Typography variant="body2">
                                    Assigned to {h.assigned_to} by {h.assigned_by} at {format(new Date(h.assigned_at), 'MM/dd/yyyy HH:mm')}
                                  </Typography>
                                )}
                                {h.completed_by && (
                                  <Typography variant="body2">
                                    Completed by {h.completed_by} at {format(new Date(h.completed_at), 'MM/dd/yyyy HH:mm')}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Box>
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
                  disabled={!reportData.requests?.length}
                >
                  Generate PDF
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setOpenEmailDialog(true)}
                  disabled={!reportData.requests?.length}
                >
                  Send to Email
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
                    {(reportData.requests || []).map((request) => (
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

      <Dialog open={openEmailDialog} onClose={() => setOpenEmailDialog(false)}>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Select Users to Email
          </Typography>
          <Autocomplete
            multiple
            options={users}
            getOptionLabel={(option) => option.username}
            value={selectedUsers}
            onChange={(event, newValue) => {
              setSelectedUsers(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Users"
                placeholder="Choose users to email"
              />
            )}
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setOpenEmailDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSendEmail}
              disabled={loading || selectedUsers.length === 0}
            >
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Reports; 