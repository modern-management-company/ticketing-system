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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tooltip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PropertySwitcher from './PropertySwitcher';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';

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
  const { auth, fetchProperties } = useAuth();
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
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [relatedItems, setRelatedItems] = useState({});

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    if (!fetchProperties) {
      console.error('fetchProperties is not available in AuthContext');
      return;
    }
    
    try {
      // Use the cached properties from AuthContext
      const propertiesData = await fetchProperties();
      if (propertiesData) {
        // Filter only active properties
        const activeProperties = propertiesData.filter(prop => prop.status === 'active');
        setProperties(activeProperties);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
      setError('Failed to load properties');
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      fetchRooms();
      fetchUsers();
    } else {
      setRooms([]);
      setSelectedRoom('');
      setUsers([]);
      setSelectedAssignee('');
    }
  }, [selectedProperty]);

  useEffect(() => {
    if (selectedProperty && selectedDate) {
      fetchReportData();
    }
  }, [selectedProperty, selectedDate, selectedRoom, selectedAssignee]);

  const fetchRooms = async () => {
    try {
      setRoomsLoading(true);
      const response = await apiClient.get(`/properties/${selectedProperty}/rooms`);
      setRooms(response.data?.rooms || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setRooms([]); // Ensure rooms is always an array even on error
    } finally {
      setRoomsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await apiClient.get(`/properties/${selectedProperty}/users`);
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]); // Ensure users is always an array even on error
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      let ticketsUrl = `/properties/${selectedProperty}/tickets?date=${formattedDate}`;
      let tasksUrl = `/properties/${selectedProperty}/tasks?date=${formattedDate}`;
      let requestsUrl = `/service-requests?property_id=${selectedProperty}`;
      
      // Add room filter if a room is selected
      if (selectedRoom) {
        ticketsUrl += `&room_id=${selectedRoom}`;
        tasksUrl += `&room_id=${selectedRoom}`;
        requestsUrl += `&room_id=${selectedRoom}`;
      }

      // Add assignee filter if an assignee is selected
      if (selectedAssignee) {
        tasksUrl += `&assigned_to=${selectedAssignee}`;
      }

      const [ticketsRes, tasksRes, requestsRes] = await Promise.all([
        apiClient.get(ticketsUrl),
        apiClient.get(tasksUrl),
        apiClient.get(requestsUrl)
      ]);

      // If room filter is applied but backend doesn't support it, filter the results client-side
      let tickets = ticketsRes.data?.tickets || [];
      let tasks = tasksRes.data?.tasks || [];
      let requests = requestsRes.data?.requests || [];

      if (selectedRoom) {
        // Client-side filtering as fallback
        tickets = tickets.filter(ticket => ticket.room_id === parseInt(selectedRoom));
        tasks = tasks.filter(task => task.room_id === parseInt(selectedRoom));
        requests = requests.filter(request => request.room_id === parseInt(selectedRoom));
      }

      if (selectedAssignee) {
        // Client-side filtering for assignee as fallback
        tasks = tasks.filter(task => task.assigned_to_id === parseInt(selectedAssignee));
      }

      // Find related items
      const relatedItemsMap = {};
      
      // For each task, find related tickets
      tasks.forEach(task => {
        if (task.ticket_id) {
          const relatedTicket = tickets.find(ticket => ticket.ticket_id === task.ticket_id);
          if (relatedTicket) {
            if (!relatedItemsMap[`task_${task.task_id}`]) {
              relatedItemsMap[`task_${task.task_id}`] = { tickets: [], requests: [] };
            }
            relatedItemsMap[`task_${task.task_id}`].tickets.push(relatedTicket);
          }
        }
        
        // Find related service requests by room
        if (task.room_id) {
          const relatedRequests = requests.filter(request => request.room_id === task.room_id);
          if (relatedRequests.length > 0) {
            if (!relatedItemsMap[`task_${task.task_id}`]) {
              relatedItemsMap[`task_${task.task_id}`] = { tickets: [], requests: [] };
            }
            relatedItemsMap[`task_${task.task_id}`].requests.push(...relatedRequests);
          }
        }
      });
      
      // For each ticket, find related tasks and service requests
      tickets.forEach(ticket => {
        const relatedTasks = tasks.filter(task => task.ticket_id === ticket.ticket_id);
        const relatedRequests = requests.filter(request => request.room_id === ticket.room_id);
        
        if (relatedTasks.length > 0 || relatedRequests.length > 0) {
          relatedItemsMap[`ticket_${ticket.ticket_id}`] = { 
            tasks: relatedTasks,
            requests: relatedRequests
          };
        }
      });
      
      // For each service request, find related tickets and tasks
      requests.forEach(request => {
        if (request.room_id) {
          const relatedTickets = tickets.filter(ticket => ticket.room_id === request.room_id);
          const relatedTasks = tasks.filter(task => task.room_id === request.room_id);
          
          if (relatedTickets.length > 0 || relatedTasks.length > 0) {
            relatedItemsMap[`request_${request.request_id}`] = { 
              tickets: relatedTickets,
              tasks: relatedTasks
            };
          }
        }
      });
      
      setRelatedItems(relatedItemsMap);
      setReportData({
        tickets,
        tasks,
        requests
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
    if (!type) {
      console.error('Report type is undefined');
      return;
    }
    
    const doc = new jsPDF();
    const property = properties.find(p => p.property_id === parseInt(selectedProperty));
    const room = selectedRoom && Array.isArray(rooms) ? rooms.find(r => r.room_id === parseInt(selectedRoom)) : null;
    const assignee = selectedAssignee && Array.isArray(users) ? users.find(u => u.user_id === parseInt(selectedAssignee)) : null;
    
    // Create title with property and room information
    let title = `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${property?.name || 'Unknown Property'}`;
    if (room) {
      title += ` - Room: ${room.name || `Room ${room.room_id}`}`;
    } else if (selectedRoom) {
      title += ` - Room ID: ${selectedRoom}`;
    }
    
    const date = format(selectedDate, 'MMMM dd, yyyy');

    // Add title and date
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${date}`, 14, 32);
    
    let startY = 40;
    
    // Add filter information if room filter is applied
    if (room) {
      doc.text(`Filtered by Room: ${room.name || `Room ${room.room_id}`}`, 14, startY);
      startY += 10;
    }
    
    // Add assignee filter information if applied
    if (assignee && type === 'tasks') {
      doc.text(`Filtered by Assignee: ${assignee.username || assignee.email || `User ${assignee.user_id}`}`, 14, startY);
      startY += 10;
    }
    
    if (room || (assignee && type === 'tasks')) {
      doc.setLineWidth(0.5);
      doc.line(14, startY, 196, startY);
      startY += 10;
    }

    if (type === 'tickets') {
      // Create table for tickets
      const ticketData = reportData.tickets.map(ticket => {
        const relatedCount = relatedItems[`ticket_${ticket.ticket_id}`] ? 
          (relatedItems[`ticket_${ticket.ticket_id}`].tasks?.length || 0) + 
          (relatedItems[`ticket_${ticket.ticket_id}`].requests?.length || 0) : 0;
          
        return [
          ticket.ticket_id,
          ticket.title,
          ticket.room_name || 'N/A',
          ticket.status,
          ticket.priority,
          ticket.created_by_username,
          format(new Date(ticket.created_at), 'MM/dd/yyyy'),
          relatedCount > 0 ? `${relatedCount} related items` : 'None'
        ];
      });

      doc.autoTable({
        startY,
        head: [['ID', 'Title', 'Room', 'Status', 'Priority', 'Created By', 'Date', 'Related Items']],
        body: ticketData,
      });
      
      // Add related items section if there are any
      const ticketsWithRelated = reportData.tickets.filter(ticket => 
        relatedItems[`ticket_${ticket.ticket_id}`] && 
        ((relatedItems[`ticket_${ticket.ticket_id}`].tasks?.length || 0) + 
         (relatedItems[`ticket_${ticket.ticket_id}`].requests?.length || 0) > 0)
      );
      
      if (ticketsWithRelated.length > 0) {
        startY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Related Items Details', 14, startY);
        startY += 10;
        
        ticketsWithRelated.forEach(ticket => {
          const related = relatedItems[`ticket_${ticket.ticket_id}`];
          doc.setFontSize(12);
          doc.text(`Ticket #${ticket.ticket_id}: ${ticket.title}`, 14, startY);
          startY += 8;
          
          if (related.tasks && related.tasks.length > 0) {
            doc.setFontSize(10);
            doc.text('Related Tasks:', 20, startY);
            startY += 6;
            
            related.tasks.forEach(task => {
              doc.text(`- Task #${task.task_id}: ${task.title} (${task.status})`, 25, startY);
              startY += 5;
            });
            startY += 3;
          }
          
          if (related.requests && related.requests.length > 0) {
            doc.setFontSize(10);
            doc.text('Related Service Requests:', 20, startY);
            startY += 6;
            
            related.requests.forEach(request => {
              doc.text(`- Request #${request.request_id}: ${request.request_type} (${request.status})`, 25, startY);
              startY += 5;
            });
            startY += 5;
          }
          
          // Add a separator line
          doc.setLineWidth(0.2);
          doc.line(14, startY, 196, startY);
          startY += 8;
          
          // Check if we need a new page
          if (startY > doc.internal.pageSize.height - 20) {
            doc.addPage();
            startY = 20;
          }
        });
      }
    } else if (type === 'tasks') {
      // Create table for tasks
      const taskData = reportData.tasks.map(task => {
        const relatedCount = relatedItems[`task_${task.task_id}`] ? 
          (relatedItems[`task_${task.task_id}`].tickets?.length || 0) + 
          (relatedItems[`task_${task.task_id}`].requests?.length || 0) : 0;
          
        return [
          task.task_id,
          task.title,
          task.room_name || 'N/A',
          task.status,
          task.priority,
          task.assigned_to_username || 'Unassigned',
          format(new Date(task.due_date || task.created_at), 'MM/dd/yyyy'),
          relatedCount > 0 ? `${relatedCount} related items` : 'None'
        ];
      });

      doc.autoTable({
        startY,
        head: [['ID', 'Title', 'Room', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Related Items']],
        body: taskData,
      });
      
      // Add related items section if there are any
      const tasksWithRelated = reportData.tasks.filter(task => 
        relatedItems[`task_${task.task_id}`] && 
        ((relatedItems[`task_${task.task_id}`].tickets?.length || 0) + 
         (relatedItems[`task_${task.task_id}`].requests?.length || 0) > 0)
      );
      
      if (tasksWithRelated.length > 0) {
        startY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Related Items Details', 14, startY);
        startY += 10;
        
        tasksWithRelated.forEach(task => {
          const related = relatedItems[`task_${task.task_id}`];
          doc.setFontSize(12);
          doc.text(`Task #${task.task_id}: ${task.title}`, 14, startY);
          startY += 8;
          
          if (related.tickets && related.tickets.length > 0) {
            doc.setFontSize(10);
            doc.text('Related Tickets:', 20, startY);
            startY += 6;
            
            related.tickets.forEach(ticket => {
              doc.text(`- Ticket #${ticket.ticket_id}: ${ticket.title} (${ticket.status})`, 25, startY);
              startY += 5;
            });
            startY += 3;
          }
          
          if (related.requests && related.requests.length > 0) {
            doc.setFontSize(10);
            doc.text('Related Service Requests:', 20, startY);
            startY += 6;
            
            related.requests.forEach(request => {
              doc.text(`- Request #${request.request_id}: ${request.request_type} (${request.status})`, 25, startY);
              startY += 5;
            });
            startY += 5;
          }
          
          // Add a separator line
          doc.setLineWidth(0.2);
          doc.line(14, startY, 196, startY);
          startY += 8;
          
          // Check if we need a new page
          if (startY > doc.internal.pageSize.height - 20) {
            doc.addPage();
            startY = 20;
          }
        });
      }
    } else if (type === 'requests') {
      // Create table for service requests
      const requestData = reportData.requests.map(request => {
        const relatedCount = relatedItems[`request_${request.request_id}`] ? 
          (relatedItems[`request_${request.request_id}`].tickets?.length || 0) + 
          (relatedItems[`request_${request.request_id}`].tasks?.length || 0) : 0;
          
        return [
          request.request_id,
          request.request_type,
          request.room_name || 'N/A',
          request.request_group,
          request.status,
          request.priority,
          request.guest_name || 'N/A',
          format(new Date(request.created_at), 'MM/dd/yyyy'),
          relatedCount > 0 ? `${relatedCount} related items` : 'None'
        ];
      });

      doc.autoTable({
        startY,
        head: [['ID', 'Type', 'Room', 'Group', 'Status', 'Priority', 'Guest', 'Date', 'Related Items']],
        body: requestData,
      });
      
      // Add related items section if there are any
      const requestsWithRelated = reportData.requests.filter(request => 
        relatedItems[`request_${request.request_id}`] && 
        ((relatedItems[`request_${request.request_id}`].tickets?.length || 0) + 
         (relatedItems[`request_${request.request_id}`].tasks?.length || 0) > 0)
      );
      
      if (requestsWithRelated.length > 0) {
        startY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Related Items Details', 14, startY);
        startY += 10;
        
        requestsWithRelated.forEach(request => {
          const related = relatedItems[`request_${request.request_id}`];
          doc.setFontSize(12);
          doc.text(`Request #${request.request_id}: ${request.request_type}`, 14, startY);
          startY += 8;
          
          if (related.tickets && related.tickets.length > 0) {
            doc.setFontSize(10);
            doc.text('Related Tickets:', 20, startY);
            startY += 6;
            
            related.tickets.forEach(ticket => {
              doc.text(`- Ticket #${ticket.ticket_id}: ${ticket.title} (${ticket.status})`, 25, startY);
              startY += 5;
            });
            startY += 3;
          }
          
          if (related.tasks && related.tasks.length > 0) {
            doc.setFontSize(10);
            doc.text('Related Tasks:', 20, startY);
            startY += 6;
            
            related.tasks.forEach(task => {
              doc.text(`- Task #${task.task_id}: ${task.title} (${task.status})`, 25, startY);
              startY += 5;
            });
            startY += 5;
          }
          
          // Add a separator line
          doc.setLineWidth(0.2);
          doc.line(14, startY, 196, startY);
          startY += 8;
          
          // Check if we need a new page
          if (startY > doc.internal.pageSize.height - 20) {
            doc.addPage();
            startY = 20;
          }
        });
      }
    }

    // Add footer with count information
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const footerText = `Page ${i} of ${pageCount} - Total ${type}: ${reportData[type].length}`;
      doc.setFontSize(10);
      doc.text(footerText, 14, doc.internal.pageSize.height - 10);
    }

    // Save the PDF
    let filename = `${type}_report_${format(selectedDate, 'yyyy-MM-dd')}`;
    if (room) {
      filename += `_room_${room.room_id}`;
    }
    if (assignee && type === 'tasks') {
      filename += `_assignee_${assignee.user_id}`;
    }
    doc.save(`${filename}.pdf`);
  };

  // Get room name by ID
  const getRoomName = (roomId) => {
    if (!roomId) return 'N/A';
    if (!Array.isArray(rooms)) return `Room ${roomId}`;
    const room = rooms.find(r => r.room_id === roomId);
    return room ? room.name : `Room ${roomId}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Reports</Typography>

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
              disabled={roomsLoading || !selectedProperty}
            >
              <MenuItem value="">All Rooms</MenuItem>
              {Array.isArray(rooms) && rooms.map((room) => (
                <MenuItem key={room.room_id} value={room.room_id}>
                  {room.name || `Room ${room.room_id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Filter Tasks by Assignee</InputLabel>
            <Select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              label="Filter Tasks by Assignee"
              disabled={usersLoading || !selectedProperty}
            >
              <MenuItem value="">All Assignees</MenuItem>
              {Array.isArray(users) && users.map((user) => (
                <MenuItem key={user.user_id} value={user.user_id}>
                  {user.username || user.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        {(selectedRoom || selectedAssignee) && (
          <Grid item xs={12} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedRoom && (
              <Chip 
                label={`Room: ${getRoomName(parseInt(selectedRoom))}`} 
                onDelete={() => setSelectedRoom('')}
                color="primary"
              />
            )}
            {selectedAssignee && (
              <Chip 
                label={`Assignee: ${users.find(u => u.user_id === parseInt(selectedAssignee))?.username || selectedAssignee}`} 
                onDelete={() => setSelectedAssignee('')}
                color="secondary"
              />
            )}
          </Grid>
        )}
      </Grid>

      {selectedRoom !== 'all' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Filtering by room: {rooms.find(r => r.room_id === selectedRoom)?.name || selectedRoom}
          </Typography>
          <Typography variant="body2">
            Showing: {reportData.tickets.length} tickets, {reportData.requests.length} requests, 
            {reportData.tasks.length} tasks
          </Typography>
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="h6">Tickets: {reportData.tickets.length}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="h6">Service Requests: {reportData.requests.length}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="h6">Related Tasks: {reportData.tasks.length}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`Tickets Report (${reportData.tickets.length})`} />
          <Tab label={`Tasks Report (${reportData.tasks.length})`} />
          <Tab label={`Service Requests Report (${reportData.requests.length})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => generatePDF('tickets')}
                  disabled={!reportData.tickets.length}
                >
                  Generate PDF
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
                      <TableCell>Related Items</TableCell>
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
                        <TableCell>
                          {relatedItems[`ticket_${ticket.ticket_id}`] && (
                            <Tooltip title="View related items">
                              <Button
                                size="small"
                                startIcon={<LinkIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const dialog = document.createElement('dialog');
                                  dialog.style.padding = '20px';
                                  dialog.style.borderRadius = '8px';
                                  dialog.style.maxWidth = '500px';
                                  
                                  const related = relatedItems[`ticket_${ticket.ticket_id}`];
                                  let content = '<h3>Related Items</h3>';
                                  
                                  if (related.tasks && related.tasks.length > 0) {
                                    content += '<h4>Tasks</h4><ul>';
                                    related.tasks.forEach(task => {
                                      content += `<li>Task #${task.task_id}: ${task.title} (${task.status})</li>`;
                                    });
                                    content += '</ul>';
                                  }
                                  
                                  if (related.requests && related.requests.length > 0) {
                                    content += '<h4>Service Requests</h4><ul>';
                                    related.requests.forEach(request => {
                                      content += `<li>Request #${request.request_id}: ${request.request_type} (${request.status})</li>`;
                                    });
                                    content += '</ul>';
                                  }
                                  
                                  dialog.innerHTML = content + '<button style="margin-top: 15px; padding: 5px 10px;">Close</button>';
                                  document.body.appendChild(dialog);
                                  
                                  const closeButton = dialog.querySelector('button');
                                  closeButton.addEventListener('click', () => {
                                    dialog.close();
                                    document.body.removeChild(dialog);
                                  });
                                  
                                  dialog.showModal();
                                }}
                              >
                                {(relatedItems[`ticket_${ticket.ticket_id}`].tasks?.length || 0) + 
                                 (relatedItems[`ticket_${ticket.ticket_id}`].requests?.length || 0)}
                              </Button>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => generatePDF('tasks')}
                  disabled={!reportData.tasks.length}
                >
                  Generate PDF
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
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Related To</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Related Items</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.tasks.map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell>{task.task_id}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.room_name || 'N/A'}</TableCell>
                        <TableCell>{task.status}</TableCell>
                        <TableCell>{task.priority}</TableCell>
                        <TableCell>{task.assigned_to_username || 'Unassigned'}</TableCell>
                        <TableCell>
                          {task.due_date ? format(new Date(task.due_date), 'MM/dd/yyyy') : 'No due date'}
                        </TableCell>
                        <TableCell>
                          {relatedItems[`task_${task.task_id}`] && (
                            <Tooltip title="View related items">
                              <Button
                                size="small"
                                startIcon={<LinkIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const dialog = document.createElement('dialog');
                                  dialog.style.padding = '20px';
                                  dialog.style.borderRadius = '8px';
                                  dialog.style.maxWidth = '500px';
                                  
                                  const related = relatedItems[`task_${task.task_id}`];
                                  let content = '<h3>Related Items</h3>';
                                  
                                  if (related.tickets && related.tickets.length > 0) {
                                    content += '<h4>Tickets</h4><ul>';
                                    related.tickets.forEach(ticket => {
                                      content += `<li>Ticket #${ticket.ticket_id}: ${ticket.title} (${ticket.status})</li>`;
                                    });
                                    content += '</ul>';
                                  }
                                  
                                  if (related.requests && related.requests.length > 0) {
                                    content += '<h4>Service Requests</h4><ul>';
                                    related.requests.forEach(request => {
                                      content += `<li>Request #${request.request_id}: ${request.request_type} (${request.status})</li>`;
                                    });
                                    content += '</ul>';
                                  }
                                  
                                  dialog.innerHTML = content + '<button style="margin-top: 15px; padding: 5px 10px;">Close</button>';
                                  document.body.appendChild(dialog);
                                  
                                  const closeButton = dialog.querySelector('button');
                                  closeButton.addEventListener('click', () => {
                                    dialog.close();
                                    document.body.removeChild(dialog);
                                  });
                                  
                                  dialog.showModal();
                                }}
                              >
                                {(relatedItems[`task_${task.task_id}`].tickets?.length || 0) + 
                                 (relatedItems[`task_${task.task_id}`].requests?.length || 0)}
                              </Button>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => generatePDF('requests')}
                  disabled={!reportData.requests.length}
                >
                  Generate PDF
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
                      <TableCell>Related Items</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.requests.map((request) => (
                      <TableRow key={request.request_id}>
                        <TableCell>{request.request_id}</TableCell>
                        <TableCell>{request.request_type}</TableCell>
                        <TableCell>{request.room_name || 'N/A'}</TableCell>
                        <TableCell>{request.request_group}</TableCell>
                        <TableCell>{request.status}</TableCell>
                        <TableCell>{request.priority}</TableCell>
                        <TableCell>{request.guest_name || 'N/A'}</TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), 'MM/dd/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {relatedItems[`request_${request.request_id}`] && (
                            <Tooltip title="View related items">
                              <Button
                                size="small"
                                startIcon={<LinkIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const dialog = document.createElement('dialog');
                                  dialog.style.padding = '20px';
                                  dialog.style.borderRadius = '8px';
                                  dialog.style.maxWidth = '500px';
                                  
                                  const related = relatedItems[`request_${request.request_id}`];
                                  let content = '<h3>Related Items</h3>';
                                  
                                  if (related.tickets && related.tickets.length > 0) {
                                    content += '<h4>Tickets</h4><ul>';
                                    related.tickets.forEach(ticket => {
                                      content += `<li>Ticket #${ticket.ticket_id}: ${ticket.title} (${ticket.status})</li>`;
                                    });
                                    content += '</ul>';
                                  }
                                  
                                  if (related.tasks && related.tasks.length > 0) {
                                    content += '<h4>Tasks</h4><ul>';
                                    related.tasks.forEach(task => {
                                      content += `<li>Task #${task.task_id}: ${task.title} (${task.status})</li>`;
                                    });
                                    content += '</ul>';
                                  }
                                  
                                  dialog.innerHTML = content + '<button style="margin-top: 15px; padding: 5px 10px;">Close</button>';
                                  document.body.appendChild(dialog);
                                  
                                  const closeButton = dialog.querySelector('button');
                                  closeButton.addEventListener('click', () => {
                                    dialog.close();
                                    document.body.removeChild(dialog);
                                  });
                                  
                                  dialog.showModal();
                                }}
                              >
                                {(relatedItems[`request_${request.request_id}`].tickets?.length || 0) + 
                                 (relatedItems[`request_${request.request_id}`].tasks?.length || 0)}
                              </Button>
                            </Tooltip>
                          )}
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