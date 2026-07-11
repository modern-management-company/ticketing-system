import React, { useState, useEffect } from 'react';
import { fetchTicketHistory, fetchTaskHistory, getCompletedInfo, getCreatorInfo, getAssignmentHistory } from './historyHelpers';
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
  Chip,
  IconButton
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PropertySwitcher from './PropertySwitcher';
import { toast } from 'react-hot-toast';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import * as XLSX from 'xlsx';
import WorkerActivityReport from './WorkerActivityReport';

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
  const [selectedEmailReportType, setSelectedEmailReportType] = useState('current');
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date()
  });
  const [openDateRangePicker, setOpenDateRangePicker] = useState(false);
  const [filters, setFilters] = useState({
    tickets: {},
    tasks: {},
    requests: {}
  });
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState('');
  const [selectedActivityUser, setSelectedActivityUser] = useState('all');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/properties');
      if (response.data) {
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
      
      const [ticketsRes, requestsRes, tasksRes] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tickets?start_date=${formattedStartDate}&end_date=${formattedEndDate}`),
        apiClient.get(`/service-requests?property_id=${selectedProperty}&start_date=${formattedStartDate}&end_date=${formattedEndDate}`),
        apiClient.get(`/properties/${selectedProperty}/tasks?start_date=${formattedStartDate}&end_date=${formattedEndDate}`)
      ]);

      let allTickets = ticketsRes.data?.tickets || [];
      let allRequests = requestsRes.data?.requests || [];
      let allTasks = tasksRes.data?.tasks || [];

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

      const ticketWithHistory = await Promise.all(
        allTickets.map(async (ticket) => {
          const history = await fetchTicketHistory(ticket.ticket_id);
          const { createdBy, createdAt } = getCreatorInfo(history);
          return {
            ...ticket,
            created_by: createdBy || ticket.created_by_username || 'Unknown', 
            created_at: createdAt || ticket.created_at,
            history: history.map(h => ({
              action: h.action,
              user: h.username || h.user_name || h.user || 'Unknown',
              timestamp: h.created_at || h.timestamp,
              old_status: h.old_value,
              new_status: h.new_value,
              field_name: h.field_name,
            }))
          };
        })
      );

      const taskWithHistory = await Promise.all(
        allTasks.map(async (task) => {
          const history = await fetchTaskHistory(task.task_id);
          const { completedBy, completedAt } = getCompletedInfo(history);
          const { createdBy, createdAt } = getCreatorInfo(history);
          const assignmentHistory = getAssignmentHistory(history);
          return {
            ...task,
            completed_by: completedBy,
            completed_at: completedAt,
            created_by: createdBy || 'Unknown',
            created_at: createdAt || task.created_at,
            assignmentHistory: assignmentHistory,
            current_assigned_to: task.assigned_to || (assignmentHistory.length > 0 ? assignmentHistory[0].assignedTo : 'Unassigned'),
            history: history.map(h => ({
              action: h.action,
              user: h.username || h.user_name || h.user || 'Unknown',
              timestamp: h.created_at || h.timestamp,
              old_status: h.old_value,
              new_status: h.new_value,
              field_name: h.field_name,
            }))
          };
        })
      );
      
      if (selectedRoom !== 'all') {
        allTickets = allTickets.filter(ticket => {
          return ticket.room_id === selectedRoom || 
                 ticket.room?.room_id === selectedRoom ||
                 ticket.room_number === selectedRoom;
        });
        
        allRequests = allRequests.filter(request => {
          return request.room_id === selectedRoom || 
                 request.room?.room_id === selectedRoom ||
                 request.room_number === selectedRoom;
        });
        
        const ticketIds = new Set(allTickets.map(t => t.ticket_id));
        const requestIds = new Set(allRequests.map(r => r.request_id));
        
        allTasks = allTasks.filter(task => {
          return (task.ticket_id && ticketIds.has(task.ticket_id)) ||
                 (task.request_id && requestIds.has(task.request_id));
        });
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

    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(12);
    doc.text(`Date: ${date}`, 14, 25);

    const data = reportData[type].map(item => {
      if (type === 'tickets') {
        return [
          item.ticket_id,
          item.title,
          item.room_name || 'N/A',
          item.status,
          item.priority,
          item.category || 'N/A',
          item.subcategory || 'N/A',
          item.created_by || 'Unknown',
          format(new Date(item.created_at), 'MM/dd/yyyy HH:mm')
        ];
      } else if (type === 'tasks') {
        const assignmentInfo = item.assignmentHistory && item.assignmentHistory.length > 0 
          ? `${item.assignmentHistory[0].assignedTo} (by ${item.assignmentHistory[0].assignedBy})` 
          : 'Unassigned';
        
        return [
          item.task_id,
          item.title,
          item.room_info?.room_name || 'N/A',
          item.status,
          item.priority,
          item.category || 'N/A',
          item.created_by || 'Unknown',
          assignmentInfo,
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
      ? ['ID', 'Title', 'Room', 'Status', 'Priority', 'Category', 'Subcategory', 'Created By', 'Created At']
      : type === 'tasks'
      ? ['ID', 'Title', 'Room', 'Status', 'Priority', 'Category', 'Created By', 'Assigned To', 'Linked To', 'Due Date', 'Completed At', 'Completed By']
      : ['ID', 'Type', 'Room', 'Group', 'Status', 'Priority', 'Guest', 'Created At'];

    doc.autoTable({
      head: [columns],
      body: data,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] }
    });

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
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
        type: selectedEmailReportType === 'current' ? reportType : selectedEmailReportType,
        activity_user_id: selectedActivityUser === 'all' ? null : selectedActivityUser,
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

  const handleFilterChange = (reportType, column, value) => {
    setFilters(prev => ({
      ...prev,
      [reportType]: {
        ...prev[reportType],
        [column]: value
      }
    }));
  };

  const clearFilters = (reportType) => {
    setFilters(prev => ({
      ...prev,
      [reportType]: {}
    }));
  };

  const FilterDialog = () => {
    const [tempFilters, setTempFilters] = useState({});
    
    useEffect(() => {
      if (currentFilterType) {
        setTempFilters(filters[currentFilterType] || {});
      }
    }, [currentFilterType, openFilterDialog]);
    
    const handleSaveFilters = () => {
      setFilters(prev => ({
        ...prev,
        [currentFilterType]: tempFilters
      }));
      setOpenFilterDialog(false);
    };
    
    const getFilterFields = () => {
      if (currentFilterType === 'tickets') {
        return [
          { field: 'ticket_id', label: 'Ticket ID' },
          { field: 'title', label: 'Title' },
          { field: 'room_name', label: 'Room' },
          { field: 'status', label: 'Status' },
          { field: 'priority', label: 'Priority' },
          { field: 'category', label: 'Category' },
          { field: 'subcategory', label: 'Subcategory' },
          { field: 'created_by', label: 'Created By' }
        ];
      } else if (currentFilterType === 'tasks') {
        return [
          { field: 'task_id', label: 'Task ID' },
          { field: 'title', label: 'Title' },
          { field: 'room_name', label: 'Room' },
          { field: 'status', label: 'Status' },
          { field: 'priority', label: 'Priority' },
          { field: 'category', label: 'Category' },
          { field: 'created_by', label: 'Created By' },
          { field: 'current_assigned_to', label: 'Assigned To' }
        ];
      } else if (currentFilterType === 'requests') {
        return [
          { field: 'request_id', label: 'Request ID' },
          { field: 'request_type', label: 'Type' },
          { field: 'room_number', label: 'Room' },
          { field: 'request_group', label: 'Group' },
          { field: 'status', label: 'Status' },
          { field: 'priority', label: 'Priority' },
          { field: 'guest_name', label: 'Guest' }
        ];
      }
      return [];
    };
    
    return (
      <Dialog 
        open={openFilterDialog} 
        onClose={() => setOpenFilterDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filter {currentFilterType}</Typography>
            <IconButton onClick={() => setOpenFilterDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Grid container spacing={2}>
            {getFilterFields().map((field) => (
              <Grid item xs={12} md={6} key={field.field}>
                <TextField
                  fullWidth
                  label={field.label}
                  value={tempFilters[field.field] || ''}
                  onChange={(e) => setTempFilters({
                    ...tempFilters,
                    [field.field]: e.target.value
                  })}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
            <Button 
              onClick={() => setTempFilters({})} 
              color="secondary"
            >
              Clear
            </Button>
            <Button 
              onClick={handleSaveFilters} 
              variant="contained"
            >
              Apply Filters
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    );
  };

  const getTaskStaffName = (task) => (
    task.current_assigned_to ||
    task.assigned_to ||
    users.find(user => user.user_id === task.assigned_to_id)?.username ||
    (task.assignmentHistory?.length ? task.assignmentHistory[0].assignedTo : '') ||
    'Unassigned'
  );

  const getTaskActivity = (task) => {
    const latestHistory = task.history?.[0];
    if (latestHistory?.action === 'updated' && latestHistory.field_name) {
      return `${latestHistory.field_name} updated`;
    }
    if (latestHistory?.action) {
      return latestHistory.action.replace(/_/g, ' ');
    }
    return task.status || 'Pending';
  };

  const getTaskComments = (task) => (
    task.description || task.comments || task.comment || 'No comments'
  );

  const getTaskEffectiveDate = (task) => {
    const dateValue = task.due_date || task.created_at;
    return dateValue ? format(new Date(dateValue), 'MM/dd/yyyy') : 'N/A';
  };

  const getActivityTasks = () => getFilteredData(reportData.tasks || [], 'tasks').filter((task) => {
    if (selectedActivityUser === 'all') return true;
    const staffName = getTaskStaffName(task).toLowerCase();
    const selectedUser = users.find(user => user.user_id === selectedActivityUser);
    return task.assigned_to_id === selectedActivityUser || staffName === selectedUser?.username?.toLowerCase();
  });

  const getFilteredData = (data, reportType) => {
    const currentFilters = filters[reportType];
    if (!currentFilters || Object.keys(currentFilters).length === 0) {
      return data;
    }
    
    return data.filter(item => {
      return Object.entries(currentFilters).every(([field, value]) => {
        if (!value) return true;
        
        const itemValue = item[field];
        if (itemValue === undefined || itemValue === null) return false;
        
        if (typeof itemValue === 'number') {
          return itemValue.toString().includes(value.toString());
        }
        
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });
  };

  const activityTasks = getActivityTasks();

  const generateExcel = (type) => {
    try {
      const property = properties.find(p => p.property_id === selectedProperty);
      const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${property?.name}`;
      const date = format(dateRange.start, 'MM/dd/yyyy') + ' to ' + format(dateRange.end, 'MM/dd/yyyy');
      
      const data = getFilteredData(reportData[type] || [], type);
      
      let wsData = [];
      
      wsData.push([title]);
      wsData.push(['Date Range: ' + date]);
      wsData.push([]);
      
      let headers = [];
      if (type === 'tickets') {
        headers = ['ID', 'Title', 'Room', 'Status', 'Priority', 'Category', 'Subcategory', 'Created By', 'Created At'];
      } else if (type === 'tasks') {
        headers = ['ID', 'Title', 'Room', 'Status', 'Priority', 'Category', 'Created By', 'Assigned To', 'Linked To', 'Due Date', 'Completed At', 'Completed By'];
      } else if (type === 'requests') {
        headers = ['ID', 'Type', 'Room', 'Group', 'Status', 'Priority', 'Guest', 'Created At'];
      }
      
      wsData.push(headers);
      
      data.forEach(item => {
        let row = [];
        if (type === 'tickets') {
          row = [
            item.ticket_id,
            item.title,
            item.room_name || 'N/A',
            item.status,
            item.priority,
            item.category || 'N/A',
            item.subcategory || 'N/A',
            item.created_by || 'Unknown',
            item.created_at ? format(new Date(item.created_at), 'MM/dd/yyyy HH:mm') : 'N/A'
          ];
        } else if (type === 'tasks') {
          const assignmentInfo = item.assignmentHistory && item.assignmentHistory.length > 0 
            ? item.assignmentHistory[0].assignedTo
            : 'Unassigned';
            
          row = [
            item.task_id,
            item.title,
            item.room_info?.room_name || 'N/A',
            item.status,
            item.priority,
            item.category || 'N/A',
            item.created_by || 'Unknown',
            assignmentInfo,
            item.ticket_id ? `Ticket #${item.ticket_id}` : 'None',
            item.due_date ? format(new Date(item.due_date), 'MM/dd/yyyy') : 'No due date',
            item.completed_at ? format(new Date(item.completed_at), 'MM/dd/yyyy HH:mm') : 'N/A',
            item.completed_by || 'N/A'
          ];
        } else if (type === 'requests') {
          row = [
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
        wsData.push(row);
      });
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      const colWidths = headers.map(h => ({ wch: Math.max(20, h.length * 1.5) }));
      ws['!cols'] = colWidths;
      
      for (let i = 0; i < headers.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: 3, c: i });
        if (!ws[cellRef]) ws[cellRef] = {};
        ws[cellRef].s = { font: { bold: true } };
      }
      
      XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
      
      XLSX.writeFile(wb, `${type}_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success(`Excel report downloaded successfully`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel file');
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
        <Grid item xs={12} md={4}>
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
        <Grid item xs={12} md={2}>
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
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Activity by User</InputLabel>
              <Select
                value={selectedActivityUser}
                label="Activity by User"
                onChange={(e) => setSelectedActivityUser(e.target.value)}
              >
                <MenuItem value="all">All Users</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.user_id} value={user.user_id}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
              {selectedActivityUser !== 'all' && (
                <Chip
                  label={`User: ${users.find(u => u.user_id === selectedActivityUser)?.username || selectedActivityUser}`}
                  onDelete={() => setSelectedActivityUser('all')}
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
          <Tab label="Worker Activity" />
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
                  color="success"
                  onClick={() => generateExcel('tickets')}
                  disabled={!reportData.tickets?.length}
                >
                  Export Excel
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => {
                    setReportType('tickets');
                    setSelectedEmailReportType('current');
                    setOpenEmailDialog(true);
                  }}
                  disabled={!reportData.tickets?.length}
                >
                  Send to Email
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => {
                    setCurrentFilterType('tickets');
                    setOpenFilterDialog(true);
                  }}
                >
                  Filter
                </Button>
                {Object.keys(filters.tickets || {}).length > 0 && (
                  <Button
                    color="secondary"
                    onClick={() => clearFilters('tickets')}
                  >
                    Clear Filters ({Object.keys(filters.tickets).length})
                  </Button>
                )}
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
                      <TableCell>Category</TableCell>
                      <TableCell>Subcategory</TableCell>
                      <TableCell>Created By</TableCell>
                      <TableCell>Created At</TableCell>
                      <TableCell>History</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredData(reportData.tickets || [], 'tickets').map((ticket) => (
                      <TableRow key={ticket.ticket_id}>
                        <TableCell>{ticket.ticket_id}</TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>{ticket.room_name || 'N/A'}</TableCell>
                        <TableCell>{ticket.status}</TableCell>
                        <TableCell>{ticket.priority}</TableCell>
                        <TableCell>{ticket.category || 'N/A'}</TableCell>
                        <TableCell>{ticket.subcategory || 'N/A'}</TableCell>
                        <TableCell>{ticket.created_by}</TableCell>
                        <TableCell>
                          {ticket.created_at ? format(new Date(ticket.created_at), 'MM/dd/yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ maxHeight: '100px', overflow: 'auto' }}>
                            {(ticket.history || []).map((h, index) => (
                              <Box key={index} sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                  {h.action === 'created' && `Created by ${h.user} at ${format(new Date(h.timestamp), 'MM/dd/yyyy HH:mm')}`}
                                  {h.action === 'updated' && h.field_name === 'status' && `Status changed from ${h.old_status} to ${h.new_status} by ${h.user} at ${format(new Date(h.timestamp), 'MM/dd/yyyy HH:mm')}`}
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
                  color="success"
                  onClick={() => generateExcel('tasks')}
                  disabled={!reportData.tasks?.length}
                >
                  Export Excel
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => {
                    setReportType('tasks');
                    setSelectedEmailReportType('current');
                    setOpenEmailDialog(true);
                  }}
                  disabled={!reportData.tasks?.length}
                >
                  Send to Email
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => {
                    setCurrentFilterType('tasks');
                    setOpenFilterDialog(true);
                  }}
                >
                  Filter
                </Button>
                {Object.keys(filters.tasks || {}).length > 0 && (
                  <Button
                    color="secondary"
                    onClick={() => clearFilters('tasks')}
                  >
                    Clear Filters ({Object.keys(filters.tasks).length})
                  </Button>
                )}
              </Box>
              <Typography variant="h6" gutterBottom>
                Pending tasks for {selectedActivityUser === 'all' ? 'All Staff' : users.find(user => user.user_id === selectedActivityUser)?.username || 'Selected User'} - {properties.find(p => p.property_id === selectedProperty)?.name || 'Property'}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {activityTasks.map((task) => (
                  <Paper key={task.task_id} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      {task.ticket_id ? `Ticket #${task.ticket_id}` : `Task #${task.task_id}`} - {task.title}
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ width: 180, fontWeight: 700 }}>Activity</TableCell>
                            <TableCell>{getTaskActivity(task)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Staff</TableCell>
                            <TableCell>{getTaskStaffName(task)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Task</TableCell>
                            <TableCell>{task.title}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Comments</TableCell>
                            <TableCell>{getTaskComments(task)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Ref No</TableCell>
                            <TableCell>{task.ticket_id ? `Ticket #${task.ticket_id}` : `Task #${task.task_id}`}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Effective Date</TableCell>
                            <TableCell>{getTaskEffectiveDate(task)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Hotel / Property</TableCell>
                            <TableCell>{properties.find(p => p.property_id === selectedProperty)?.name || 'Hotel'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell>{task.status}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                ))}
                {activityTasks.length === 0 && (
                  <Alert severity="info">No tasks match the selected management filters.</Alert>
                )}
              </Box>
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
                  color="success"
                  onClick={() => generateExcel('requests')}
                  disabled={!reportData.requests?.length}
                >
                  Export Excel
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => {
                    setReportType('requests');
                    setSelectedEmailReportType('current');
                    setOpenEmailDialog(true);
                  }}
                  disabled={!reportData.requests?.length}
                >
                  Send to Email
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => {
                    setCurrentFilterType('requests');
                    setOpenFilterDialog(true);
                  }}
                >
                  Filter
                </Button>
                {Object.keys(filters.requests || {}).length > 0 && (
                  <Button
                    color="secondary"
                    onClick={() => clearFilters('requests')}
                  >
                    Clear Filters ({Object.keys(filters.requests).length})
                  </Button>
                )}
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
                    {getFilteredData(reportData.requests || [], 'requests').map((request) => (
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

            <TabPanel value={tabValue} index={3}>
              <WorkerActivityReport />
            </TabPanel>
          </>
        )}
      </Paper>

      <Dialog open={openEmailDialog} onClose={() => setOpenEmailDialog(false)}>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Select Users to Email
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Report Content</InputLabel>
            <Select
              value={selectedEmailReportType}
              label="Report Content"
              onChange={(e) => setSelectedEmailReportType(e.target.value)}
            >
              <MenuItem value="current">Current Tab ({reportType})</MenuItem>
              <MenuItem value="all">Tickets, Tasks, and Requests</MenuItem>
              <MenuItem value="tickets">Tickets Only</MenuItem>
              <MenuItem value="tasks">Tasks Only</MenuItem>
              <MenuItem value="requests">Service Requests Only</MenuItem>
            </Select>
          </FormControl>
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

      <FilterDialog />
    </Box>
  );
};

export default Reports;