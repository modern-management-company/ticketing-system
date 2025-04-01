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
  Autocomplete
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestoreIcon from '@mui/icons-material/Restore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import RefreshIcon from '@mui/icons-material/Refresh';

const ViewTask = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [openDueDatePicker, setOpenDueDatePicker] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    status: 'pending',
    assigned_to_id: '',
    due_date: null,
    ticket_id: null,
    time_spent: '',
    cost: ''
  });
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(null);
  const [navigatingToTicket, setNavigatingToTicket] = useState(null);

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const statuses = ['pending', 'in progress', 'completed'];

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  useEffect(() => {
    if (task?.property_id) {
      fetchUsers();
      fetchTickets();
    }
  }, [task?.property_id]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/tasks/${taskId}`);
      setTask(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch task:', error);
      setError(error.response?.data?.msg || 'Failed to fetch task. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get(`/properties/${task.property_id}/users`);
      if (response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await apiClient.get(`/properties/${task.property_id}/tickets`);
      if (response.data?.tickets) {
        setTickets(response.data.tickets);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setError('Failed to load ticket information. Please try refreshing the page.');
    }
  };

  const handleStatusChange = async (newStatus) => {
    setNewStatus(newStatus);
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { status: newStatus });
      setMessage('Task status updated successfully');
      setStatusDialogOpen(false);
      fetchTask(); // Refresh task data
    } catch (error) {
      setError('Failed to update task status');
    }
  };

  const handleDeleteTask = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await apiClient.delete(`/tasks/${taskId}`);
        setMessage('Task deleted successfully');
        navigate('/tasks');
      } catch (error) {
        setError('Failed to delete task');
      }
    }
  };

  const handleOpenDialog = () => {
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assigned_to_id: task.assigned_to_id || '',
      due_date: task.due_date ? new Date(task.due_date) : null,
      ticket_id: task.ticket_id || null,
      time_spent: task.time_spent || '',
      cost: task.cost || ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setTaskForm({
      title: '',
      description: '',
      priority: 'Low',
      status: 'pending',
      assigned_to_id: '',
      due_date: null,
      ticket_id: null,
      time_spent: '',
      cost: ''
    });
  };

  const handleUpdateTask = async () => {
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
      await apiClient.patch(`/tasks/${taskId}`, taskForm);
      setMessage('Task updated successfully');
      handleCloseDialog();
      fetchTask();
    } catch (error) {
      console.error('Failed to update task:', error);
      setError(error.response?.data?.msg || 'Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Failed';
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'info';
    if (score >= 70) return 'warning';
    if (score >= 60) return 'error';
    return 'error';
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

  if (!task) {
    return (
      <Box p={3}>
        <Alert severity="error">Task not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Tooltip title="Back to Tasks">
          <IconButton onClick={() => navigate('/tasks')}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h5">Task #{task.task_id}</Typography>
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
                <Typography variant="h6" gutterBottom>{task.title}</Typography>
                <Typography variant="body1" paragraph>{task.description}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    fetchTask();
                    fetchUsers();
                    fetchTickets();
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
                  Edit Task
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
              label={task.status}
              color={
                task.status.toLowerCase() === 'pending' ? 'warning' :
                task.status.toLowerCase() === 'in progress' ? 'info' :
                'success'
              }
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Priority</Typography>
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
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Assigned To</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                {users.find(u => u.user_id === task.assigned_to_id)?.username || 'Unassigned'}
              </Typography>
              {task.assigned_to_id && (
                <Chip 
                  label={users.find(u => u.user_id === task.assigned_to_id)?.group || 'N/A'} 
                  variant="outlined"
                  size="small"
                  color="primary"
                />
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Due Date</Typography>
            <Typography variant="body2">
              {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Linked Ticket</Typography>
            {task.ticket_id ? (
              <Chip
                label={`Ticket #${task.ticket_id}`}
                size="small"
                color="secondary"
                variant="outlined"
                onClick={() => {
                  setNavigatingToTicket(task.ticket_id);
                  navigate(`/tickets/${task.ticket_id}`);
                }}
                sx={{ cursor: 'pointer' }}
              />
            ) : (
              <Typography variant="body2">N/A</Typography>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Room</Typography>
            {task.room_info ? (
              <Tooltip title={`From Ticket #${task.room_info.ticket_id}`}>
                <Chip 
                  label={task.room_info.room_name}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Tooltip>
            ) : (
              <Typography variant="body2">N/A</Typography>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Time Spent</Typography>
            <Typography variant="body2">
              {task.time_spent ? `${task.time_spent} hours` : 'N/A'}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Cost</Typography>
            <Typography variant="body2">
              {task.cost ? `$${task.cost.toFixed(2)}` : 'N/A'}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>Completion Score</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {task.completion_score !== null ? (
                <>
                  <Typography variant="body2">
                    {task.completion_score.toFixed(1)}/100
                  </Typography>
                  <Chip 
                    label={getScoreLabel(task.completion_score)}
                    color={getScoreColor(task.completion_score)}
                    size="small"
                  />
                </>
              ) : (
                <Typography variant="body2">N/A</Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {task.status.toLowerCase() !== 'completed' ? (
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
                  onClick={() => handleStatusChange('pending')}
                  color="primary"
                  variant="outlined"
                >
                  Reopen Task
                </Button>
              )}

              {(auth?.user?.role === 'super_admin' || 
                task.created_by_id === auth?.user?.user_id) && (
                <Button
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteTask}
                  color="error"
                  variant="outlined"
                >
                  Delete Task
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Task
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
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              multiline
              rows={4}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Assigned To</InputLabel>
              <Select
                value={taskForm.assigned_to_id || ''}
                onChange={(e) => setTaskForm({ ...taskForm, assigned_to_id: e.target.value })}
                label="Assigned To"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.user_id} value={user.user_id}>
                    {user.username} ({user.group || 'No Group'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                label="Priority"
              >
                {priorities.map((priority) => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                label="Status"
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Due Date"
                  value={taskForm.due_date ? format(new Date(taskForm.due_date), 'MM/dd/yyyy') : ''}
                  onClick={() => setOpenDueDatePicker(true)}
                  inputProps={{ readOnly: true }}
                />
                {taskForm.due_date && (
                  <Button 
                    variant="outlined" 
                    color="secondary"
                    onClick={() => setTaskForm({ ...taskForm, due_date: null })}
                  >
                    Clear
                  </Button>
                )}
              </Box>
              <Dialog open={openDueDatePicker} onClose={() => setOpenDueDatePicker(false)}>
                <DialogContent>
                  <StaticDatePicker
                    displayStaticWrapperAs="desktop"
                    value={taskForm.due_date ? new Date(taskForm.due_date) : null}
                    onChange={(newValue) => {
                      setTaskForm({ ...taskForm, due_date: newValue });
                      setOpenDueDatePicker(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </LocalizationProvider>
            <FormControl fullWidth>
              <InputLabel>Linked Ticket</InputLabel>
              <Select
                value={taskForm.ticket_id || ''}
                onChange={(e) => setTaskForm({ ...taskForm, ticket_id: e.target.value ? Number(e.target.value) : null })}
                label="Linked Ticket"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {tickets
                  .filter(ticket => ticket.status.toLowerCase() !== 'completed' || ticket.ticket_id === taskForm.ticket_id)
                  .map((ticket) => (
                    <MenuItem key={ticket.ticket_id} value={ticket.ticket_id}>
                      #{ticket.ticket_id}: {ticket.title.substring(0, 50)}{ticket.title.length > 50 ? '...' : ''}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="Cost ($)"
              type="number"
              value={taskForm.cost}
              onChange={(e) => setTaskForm({ ...taskForm, cost: e.target.value })}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              label="Time Spent (hours)"
              type="number"
              value={taskForm.time_spent}
              onChange={(e) => setTaskForm({ ...taskForm, time_spent: e.target.value })}
              fullWidth
              inputProps={{ min: 0, step: 0.5 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancel</Button>
          <Button 
            onClick={handleUpdateTask} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Task'}
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
            Are you sure you want to mark this task as {newStatus}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmStatusChange} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewTask; 