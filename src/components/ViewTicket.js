import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from "./apiClient";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  FormControlLabel
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestoreIcon from '@mui/icons-material/Restore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import LockIcon from '@mui/icons-material/Lock';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

const ViewTicket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    category: 'General',
    subcategory: '',
    room_id: '',
    // Incident Report fields
    is_incident_report: false,
    incident_type: '',
    incident_location: '',
    incident_date: null,
    injury_type: '',
    severity: '',
    witness_names: '',
    police_report_filed: false,
    insurance_claim_filed: false,
    claim_number: '',
    follow_up_required: true,
    follow_up_date: null
  });
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [navigatingToTask, setNavigatingToTask] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(null);
  const [openAddTaskDialog, setOpenAddTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    status: 'pending',
    assigned_to_id: '',
    due_date: null,
    ticket_id: null
  });
  const [openDueDatePicker, setOpenDueDatePicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileInputRef, setFileInputRef] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showProDialog, setShowProDialog] = useState(false);

  const isProUser = auth?.user?.subscription_plan === 'premium';
  const canManageAttachments = isProUser && ticket?.property_id;

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const categories = ['General', 'Maintenance', 'Security', 'Housekeeping', 'Other'];
  
  const subcategories = {
    'Maintenance': ['Plumbing', 'Electrical', 'HVAC', 'Structural', 'Appliances', 'Other'],
    'Cleaning': ['Room Cleaning', 'Common Area', 'Deep Cleaning', 'Laundry', 'Other'],
    'Security': ['Access Control', 'Surveillance', 'Incident Report', 'Safety Concern', 'Other'],
    'IT Support': ['Network', 'Hardware', 'Software', 'Account Access', 'Other'],
    'General': ['General Inquiry', 'Feedback', 'Request', 'Complaint', 'Other'],
    'Housekeeping': ['Room Cleaning', 'Common Area', 'Deep Cleaning', 'Laundry', 'Other'],
    'Other': ['General Inquiry', 'Feedback', 'Request', 'Complaint', 'Other']
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    if (ticket?.property_id) {
      fetchRooms();
      fetchTasks();
      fetchUsers();
    }
  }, [ticket?.property_id]);

  useEffect(() => {
    if (ticketId) {
      fetchHistory();
    }
  }, [ticketId]);

  useEffect(() => {
    if (tasks.length > 0) {
      const sortedTasks = [...tasks].sort((a, b) => {
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
      
      setTasks(sortedTasks);
    }
  }, [tasks]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/tickets/${ticketId}`);
      setTicket(response.data);
      setAttachments(response.data.attachments || []);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      setError(error.response?.data?.msg || 'Failed to fetch ticket. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await apiClient.get(`/properties/${ticket.property_id}/rooms`);
      if (response.data?.rooms) {
        setRooms(response.data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setError('Failed to load room information. Please try refreshing the page.');
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await apiClient.get(`/properties/${ticket.property_id}/tasks`);
      if (response.data?.tasks) {
        // Filter tasks to only show those linked to this ticket
        const linkedTasks = response.data.tasks.filter(task => task.ticket_id === parseInt(ticketId));
        
        // Sort tasks by priority and then by duration (created_at date)
        const sortedTasks = linkedTasks.sort((a, b) => {
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
        
        console.log('Sorted tasks by priority and duration: ', sortedTasks.map(t => ({ 
          id: t.task_id, 
          priority: t.priority, 
          created: t.created_at 
        })));
        
        setTasks(sortedTasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setError('Failed to load linked tasks. Please try refreshing the page.');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get(`/properties/${ticket.property_id}/users`);
      if (response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load user information. Please try refreshing the page.');
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await apiClient.get(`/tickets/${ticketId}/history`);
      setHistory(response.data.history);
    } catch (error) {
      console.error('Failed to fetch ticket history:', error);
      setError('Failed to load ticket history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setNewStatus(newStatus);
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    try {
      await apiClient.patch(`/tickets/${ticketId}`, { status: newStatus });
      setMessage('Ticket status updated successfully');
      setStatusDialogOpen(false);
      fetchTicket(); // Refresh ticket data
    } catch (error) {
      setError('Failed to update ticket status');
    }
  };

  const handleDeleteTicket = async () => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      try {
        await apiClient.delete(`/tickets/${ticketId}`);
        setMessage('Ticket deleted successfully');
        navigate('/tickets');
      } catch (error) {
        setError('Failed to delete ticket');
      }
    }
  };

  const handleOpenDialog = () => {
    setTicketForm({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      subcategory: ticket.subcategory || '',
      room_id: ticket.room_id || '',
      // Incident Report fields
      is_incident_report: ticket.is_incident_report || false,
      incident_type: ticket.incident_type || '',
      incident_location: ticket.incident_location || '',
      incident_date: ticket.incident_date ? new Date(ticket.incident_date) : null,
      injury_type: ticket.injury_type || '',
      severity: ticket.severity || '',
      witness_names: ticket.witness_names || '',
      police_report_filed: ticket.police_report_filed || false,
      insurance_claim_filed: ticket.insurance_claim_filed || false,
      claim_number: ticket.claim_number || '',
      follow_up_required: ticket.follow_up_required || true,
      follow_up_date: ticket.follow_up_date ? new Date(ticket.follow_up_date) : null
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setTicketForm({
      title: '',
      description: '',
      priority: 'Low',
      category: 'General',
      subcategory: '',
      room_id: '',
      // Incident Report fields
      is_incident_report: false,
      incident_type: '',
      incident_location: '',
      incident_date: null,
      injury_type: '',
      severity: '',
      witness_names: '',
      police_report_filed: false,
      insurance_claim_filed: false,
      claim_number: '',
      follow_up_required: true,
      follow_up_date: null
    });
  };

  const handleUpdateTicket = async () => {
    try {
      if (isSubmitting) return;
      
      if (!ticketForm.title.trim()) {
        setError('Title is required');
        return;
      }
      if (!ticketForm.description.trim()) {
        setError('Description is required');
        return;
      }

      setIsSubmitting(true);
      await apiClient.patch(`/tickets/${ticketId}`, ticketForm);
      setMessage('Ticket updated successfully');
      handleCloseDialog();
      fetchTicket();
    } catch (error) {
      console.error('Failed to update ticket:', error);
      setError(error.response?.data?.msg || 'Failed to update ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddTaskDialog = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'Low',
      status: 'pending',
      assigned_to_id: '',
      due_date: null,
      ticket_id: parseInt(ticketId)
    });
    setOpenAddTaskDialog(true);
  };

  const handleCloseAddTaskDialog = () => {
    setOpenAddTaskDialog(false);
    setTaskForm({
      title: '',
      description: '',
      priority: 'Low',
      status: 'pending',
      assigned_to_id: '',
      due_date: null,
      ticket_id: null
    });
  };

  const handleCreateTask = async () => {
    try {
      if (isSubmitting) return;
      
      if (!taskForm.title.trim()) {
        setError('Title is required');
        return;
      }
      if (!taskForm.description.trim()) {
        setError('Description is required');
        return;
      }

      setIsSubmitting(true);
      await apiClient.post('/tasks', {
        ...taskForm,
        property_id: ticket.property_id
      });
      setMessage('Task created successfully');
      handleCloseAddTaskDialog();
      fetchTasks(); // Refresh tasks list
    } catch (error) {
      console.error('Failed to create task:', error);
      setError(error.response?.data?.msg || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
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

  const handleFileUpload = async (event) => {
    if (!canManageAttachments) {
      setShowProDialog(true);
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(`/tickets/${ticketId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAttachments([...attachments, response.data.attachment]);
      setMessage('File uploaded successfully');
      event.target.value = null; // Reset file input
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!canManageAttachments) {
      setShowProDialog(true);
      return;
    }

    try {
      await apiClient.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);
      setAttachments(attachments.filter(att => att.attachment_id !== attachmentId));
      setMessage('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      setError('Failed to delete attachment');
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const response = await apiClient.get(`/tickets/${ticketId}/attachments/${attachment.attachment_id}/download`);
      window.open(response.data.file_url, '_blank');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setError('Failed to download attachment');
    }
  };

  const getHistoryActionColor = (action) => {
    switch (action) {
      case 'created':
        return 'success';
      case 'updated':
        return 'info';
      case 'status_changed':
        return 'warning';
      case 'assigned':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatHistoryEntry = (entry) => {
    switch (entry.action) {
      case 'created':
        return `Ticket created by ${entry.username}`;
      case 'updated':
        return `${entry.username} updated ${entry.field_name} from "${entry.old_value}" to "${entry.new_value}"`;
      case 'status_changed':
        return `${entry.username} changed status from "${entry.old_value}" to "${entry.new_value}"`;
      case 'assigned':
        return `${entry.username} assigned the ticket to ${entry.new_value}`;
      default:
        return `${entry.username} performed ${entry.action}`;
    }
  };

  // Add a helper function after existing functions to calculate time elapsed
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

  // Get color based on elapsed time and priority
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
      return 'error';  // Red after 7 days (adjusted by priority)
    } else if (diffDays >= 3 * multiplier) {
      return 'warning'; // Orange after 3 days (adjusted by priority)
    } else if (diffDays >= 1 * multiplier) {
      return 'info';   // Blue after 1 day (adjusted by priority)
    } else {
      return 'success'; // Green for recent items
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box p={3}>
        <Alert severity="error">Ticket not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Tooltip title="Back to Tickets">
          <IconButton onClick={() => navigate('/tickets')}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h5">Ticket #{ticket.ticket_id}</Typography>
      </Box>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" gutterBottom>{ticket.title}</Typography>
                <Typography variant="body1" paragraph>{ticket.description}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    fetchTicket();
                    fetchTasks();
                    fetchUsers();
                  }}
                  variant="outlined"
                >
                  Refresh
                </Button>
                <Button
                  startIcon={<EditIcon />}
                  onClick={handleOpenDialog}
                  variant="outlined"
                >
                  Edit Ticket
                </Button>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Status</Typography>
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

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Priority</Typography>
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

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Category</Typography>
            <Typography variant="body2">{ticket.category}</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Subcategory</Typography>
            <Typography variant="body2">{ticket.subcategory || 'N/A'}</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Room</Typography>
            <Typography variant="body2">{ticket.room_name || 'N/A'}</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Created By</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{ticket.created_by_username}</Typography>
              <Chip 
                label={ticket.created_by_group || 'N/A'} 
                variant="outlined"
                size="small"
                color="primary"
              />
            </Box>
          </Grid>

          {/* Incident Report Details */}
          {ticket.is_incident_report && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ReportProblemIcon color="warning" />
                  <Typography variant="h6" color="warning.main">Incident Report Details</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Incident Type</Typography>
                <Chip 
                  label={ticket.incident_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Severity</Typography>
                <Chip 
                  label={ticket.severity || 'N/A'}
                  color={
                    ticket.severity === 'severe' ? 'error' :
                    ticket.severity === 'moderate' ? 'warning' :
                    'success'
                  }
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Incident Location</Typography>
                <Typography variant="body2">{ticket.incident_location || 'N/A'}</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Incident Date</Typography>
                <Typography variant="body2">
                  {ticket.incident_date ? new Date(ticket.incident_date).toLocaleString() : 'N/A'}
                </Typography>
              </Grid>

              {ticket.injury_type && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Injury Type</Typography>
                  <Typography variant="body2">{ticket.injury_type}</Typography>
                </Grid>
              )}

              {ticket.witness_names && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Witnesses</Typography>
                  <Typography variant="body2">{ticket.witness_names}</Typography>
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Police Report</Typography>
                <Chip 
                  label={ticket.police_report_filed ? 'Filed' : 'Not Filed'}
                  color={ticket.police_report_filed ? 'success' : 'default'}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Insurance Claim</Typography>
                <Chip 
                  label={ticket.insurance_claim_filed ? 'Filed' : 'Not Filed'}
                  color={ticket.insurance_claim_filed ? 'success' : 'default'}
                  size="small"
                />
              </Grid>

              {ticket.claim_number && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Claim Number</Typography>
                  <Typography variant="body2">{ticket.claim_number}</Typography>
                </Grid>
              )}

              {ticket.follow_up_required && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Follow-up Required</Typography>
                  <Typography variant="body2" color="warning.main">Yes</Typography>
                  {ticket.follow_up_date && (
                    <Typography variant="caption" display="block" color="textSecondary">
                      Due: {new Date(ticket.follow_up_date).toLocaleDateString()}
                    </Typography>
                  )}
                </Grid>
              )}
            </>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {ticket.status.toLowerCase() !== 'completed' ? (
                <Button
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleStatusChange('completed')}
                  color="success"
                  variant="outlined"
                >
                  Mark Complete
                </Button>
              ) : (
                <Button
                  startIcon={<RestoreIcon />}
                  onClick={() => handleStatusChange('open')}
                  color="primary"
                  variant="outlined"
                >
                  Reopen Ticket
                </Button>
              )}

              {(auth?.user?.role === 'super_admin') && (
                <Button
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteTicket}
                  color="error"
                  variant="outlined"
                >
                  Delete Ticket
                </Button>
              )}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Linked Tasks</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => navigate('/tasks', { 
                  state: { 
                    createTask: true,
                    ticketId: ticketId,
                    propertyId: ticket.property_id
                  }
                })}
                variant="contained"
                color="primary"
                size="small"
              >
                Add Task
              </Button>
            </Box>
            {tasks.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {tasks.map((task) => (
                  <Paper key={task.task_id} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" gutterBottom>{task.title}</Typography>
                        <Typography variant="body2" color="textSecondary" paragraph>{task.description}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={task.status}
                            color={
                              task.status.toLowerCase() === 'pending' ? 'warning' :
                              task.status.toLowerCase() === 'in progress' ? 'info' :
                              'success'
                            }
                            size="small"
                          />
                          <Chip 
                            label={task.priority}
                            color={
                              task.priority === 'Critical' ? 'error' :
                              task.priority === 'High' ? 'warning' :
                              task.priority === 'Medium' ? 'info' :
                              'success'
                            }
                            size="small"
                          />
                          <Chip 
                            label={users.find(u => u.user_id === task.assigned_to_id)?.username || 'Unassigned'}
                            variant="outlined"
                            size="small"
                          />
                          {task.due_date && (
                            <Chip 
                              label={`Due: ${new Date(task.due_date).toLocaleDateString()}`}
                              variant="outlined"
                              size="small"
                            />
                          )}
                          {task.status.toLowerCase() !== 'completed' && (
                            <Chip 
                              label={`Pending: ${getTimeElapsed(task.created_at)}`}
                              variant="outlined"
                              size="small"
                              color={getPendingTimeColor(task.created_at, task.priority)}
                            />
                          )}
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          if (navigatingToTask !== task.task_id) {
                            setNavigatingToTask(task.task_id);
                            navigate(`/tasks/${task.task_id}`);
                          }
                        }}
                        disabled={navigatingToTask === task.task_id}
                      >
                        {navigatingToTask === task.task_id ? 'Loading...' : 'View Task'}
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No tasks linked to this ticket.
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Attachments
            {!canManageAttachments && <LockIcon sx={{ ml: 1, fontSize: '1rem' }} />}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AttachFileIcon />}
            onClick={() => fileInputRef?.click()}
            disabled={uploadingFile || !canManageAttachments}
          >
            {uploadingFile ? 'Uploading...' : 'Add Attachment'}
          </Button>
          <input
            type="file"
            ref={setFileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </Box>

        <List>
          {attachments.map((attachment) => (
            <ListItem key={attachment.attachment_id}>
              <ListItemText
                primary={attachment.file_name}
                secondary={`Uploaded by ${attachment.uploaded_by_username} on ${format(new Date(attachment.uploaded_at), 'PPpp')}`}
              />
              <ListItemSecondaryAction>
                <Tooltip title="Download">
                  <IconButton
                    edge="end"
                    onClick={() => handleDownloadAttachment(attachment)}
                    sx={{ mr: 1 }}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                {canManageAttachments && (
                  <Tooltip title="Delete">
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteAttachment(attachment.attachment_id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          {attachments.length === 0 && (
            <ListItem>
              <ListItemText 
                primary="No attachments" 
                secondary={!canManageAttachments ? "Upgrade to Pro plan to manage attachments" : ""}
              />
            </ListItem>
          )}
        </List>
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">History</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchHistory}
            disabled={loadingHistory}
            variant="outlined"
          >
            {loadingHistory ? 'Loading...' : 'Refresh History'}
          </Button>
        </Box>

        <Timeline>
          {history.map((entry, index) => (
            <TimelineItem key={entry.history_id}>
              <TimelineSeparator>
                <TimelineDot color={getHistoryActionColor(entry.action)} />
                {index < history.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="body2" color="textSecondary">
                  {format(new Date(entry.created_at), 'PPpp')}
                </Typography>
                <Typography variant="body1">
                  {formatHistoryEntry(entry)}
                </Typography>
              </TimelineContent>
            </TimelineItem>
          ))}
          {history.length === 0 && (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
              No history available
            </Typography>
          )}
        </Timeline>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Ticket
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
                  room_id: newValue?.room_id || ''
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

            {/* Incident Report Section */}
            <Divider sx={{ my: 2 }}>
              <Chip label="Incident Report Details" color="warning" />
            </Divider>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={ticketForm.is_incident_report}
                  onChange={(e) => setTicketForm({ 
                    ...ticketForm, 
                    is_incident_report: e.target.checked 
                  })}
                />
              }
              label="This is an incident report"
            />

            {ticketForm.is_incident_report && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Incident Type</InputLabel>
                  <Select
                    value={ticketForm.incident_type}
                    onChange={(e) => setTicketForm({ ...ticketForm, incident_type: e.target.value })}
                    label="Incident Type"
                  >
                    <MenuItem value="guest_injury">Guest Injury</MenuItem>
                    <MenuItem value="employee_injury">Employee Injury</MenuItem>
                    <MenuItem value="property_damage">Property Damage</MenuItem>
                    <MenuItem value="security_incident">Security Incident</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Incident Location"
                  value={ticketForm.incident_location}
                  onChange={(e) => setTicketForm({ ...ticketForm, incident_location: e.target.value })}
                  fullWidth
                  placeholder="e.g., Room 101, Lobby, Parking Lot"
                />

                <TextField
                  label="Incident Date & Time"
                  type="datetime-local"
                  value={ticketForm.incident_date ? format(ticketForm.incident_date, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setTicketForm({ 
                    ...ticketForm, 
                    incident_date: e.target.value ? new Date(e.target.value) : null 
                  })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Injury Type (if applicable)"
                  value={ticketForm.injury_type}
                  onChange={(e) => setTicketForm({ ...ticketForm, injury_type: e.target.value })}
                  fullWidth
                  placeholder="e.g., Bruise, Cut, Sprain"
                />

                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={ticketForm.severity}
                    onChange={(e) => setTicketForm({ ...ticketForm, severity: e.target.value })}
                    label="Severity"
                  >
                    <MenuItem value="minor">Minor</MenuItem>
                    <MenuItem value="moderate">Moderate</MenuItem>
                    <MenuItem value="severe">Severe</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Witness Names"
                  value={ticketForm.witness_names}
                  onChange={(e) => setTicketForm({ ...ticketForm, witness_names: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Names of any witnesses to the incident"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={ticketForm.police_report_filed}
                      onChange={(e) => setTicketForm({ 
                        ...ticketForm, 
                        police_report_filed: e.target.checked 
                      })}
                    />
                  }
                  label="Police report filed"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={ticketForm.insurance_claim_filed}
                      onChange={(e) => setTicketForm({ 
                        ...ticketForm, 
                        insurance_claim_filed: e.target.checked 
                      })}
                    />
                  }
                  label="Insurance claim filed"
                />

                {ticketForm.insurance_claim_filed && (
                  <TextField
                    label="Claim Number"
                    value={ticketForm.claim_number}
                    onChange={(e) => setTicketForm({ ...ticketForm, claim_number: e.target.value })}
                    fullWidth
                    placeholder="Insurance claim number"
                  />
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={ticketForm.follow_up_required}
                      onChange={(e) => setTicketForm({ 
                        ...ticketForm, 
                        follow_up_required: e.target.checked 
                      })}
                    />
                  }
                  label="Follow-up required"
                />

                {ticketForm.follow_up_required && (
                  <TextField
                    label="Follow-up Date"
                    type="datetime-local"
                    value={ticketForm.follow_up_date ? format(ticketForm.follow_up_date, "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setTicketForm({ 
                      ...ticketForm, 
                      follow_up_date: e.target.value ? new Date(e.target.value) : null 
                    })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancel</Button>
          <Button 
            onClick={handleUpdateTicket} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
      >
        <DialogTitle>Confirm Status Change</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark this ticket as {newStatus}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmStatusChange} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pro Plan Dialog */}
      <Dialog open={showProDialog} onClose={() => setShowProDialog(false)}>
        <DialogTitle>Pro Plan Required</DialogTitle>
        <DialogContent>
          <Typography>
            This feature is only available with our Pro plan. Upgrade to access:
          </Typography>
          <ul>
            <li>File Upload Management</li>
            <li>Attachment Management</li>
            <li>Property-based File Storage</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProDialog(false)}>Cancel</Button>
          <Button onClick={() => window.location.href = '/pricing'} color="primary">
            View Pricing
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewTicket; 