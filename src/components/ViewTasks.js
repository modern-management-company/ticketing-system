import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from "./apiClient"; 
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
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip
} from "@mui/material";
import { useAuth } from '../context/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import AddIcon from '@mui/icons-material/Add';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import PropertySwitcher from './PropertySwitcher';

const ViewTasks = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    status: 'pending',
    assigned_to_id: ''
  });

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const statuses = ['pending', 'in progress', 'completed'];

  useEffect(() => {
    if (selectedProperty) {
      fetchData();
    }
  }, [selectedProperty]);

  const fetchData = async () => {
    try {
      if (!auth?.token || !selectedProperty) {
        return;
      }

      setLoading(true);
      const [tasksResponse, usersResponse, ticketsResponse] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tasks`),
        apiClient.get(`/properties/${selectedProperty}/users`),
        apiClient.get(`/properties/${selectedProperty}/tickets`)
      ]);

      console.log('Tasks response:', tasksResponse.data); // Debug log
      console.log('Users response:', usersResponse.data); // Debug log

      if (tasksResponse.data?.tasks) {
        setTasks(tasksResponse.data.tasks);
      }
      if (usersResponse.data?.users) {
        // Include all users regardless of role
        setUsers(usersResponse.data.users);
      }
      if (ticketsResponse.data?.tickets) {
        setTickets(ticketsResponse.data.tickets);
      }
      setError(null);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportTicket = (ticket) => {
    setTaskForm({
      title: `[Ticket #${ticket.ticket_id}] ${ticket.title}`,
      description: ticket.description,
      priority: ticket.priority,
      status: 'pending',
      assigned_to_id: '',
      ticket_id: ticket.ticket_id
    });
    setOpenImportDialog(false);
    setOpenDialog(true);
  };

  const handleCreateOrEdit = async () => {
    try {
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }

      const taskData = {
        ...taskForm,
        property_id: selectedProperty
      };

      if (editingTask) {
        await apiClient.patch(`/tasks/${editingTask.task_id}`, taskData);
        setMessage('Task updated successfully');
      } else {
        await apiClient.post('/tasks', taskData);
        setMessage('Task created successfully');
      }
      fetchData();
      handleCloseDialog();
    } catch (error) {
      setError('Failed to save task');
      console.error(error);
    }
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        assigned_to_id: task.assigned_to_id || ''
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        priority: 'Low',
        status: 'pending',
        assigned_to_id: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      priority: 'Low',
      status: 'pending',
      assigned_to_id: ''
    });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map(task => 
        task.task_id === taskId ? { ...task, status: newStatus } : task
      ));
      setMessage('Task status updated successfully');
    } catch (error) {
      setError('Failed to update task status');
      console.error(error);
    }
  };

  const handleAssigneeChange = async (taskId, newUserId) => {
    try {
      if (!taskId) {
        setError('Invalid task ID');
        return;
      }

      const data = { assigned_to_id: newUserId };
      if (newUserId === '') {
        data.assigned_to_id = null;  // Handle unassignment properly
      }

      const response = await apiClient.patch(`/tasks/${taskId}`, data);
      
      if (response.data && response.data.task) {
        // Update the local task state
        setTasks(tasks.map(task => 
          task.task_id === taskId ? { ...task, assigned_to_id: newUserId } : task
        ));
        setMessage('Task assigned successfully');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Failed to update task assignee:', error);
      setError(error.response?.data?.msg || 'Failed to update task assignee');
    }
  };

  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return 'warning';
      case 'in progress':
        return 'info';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Tasks</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <PropertySwitcher onPropertyChange={handlePropertyChange} />
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ImportExportIcon />}
            onClick={() => setOpenImportDialog(true)}
            disabled={!selectedProperty}
          >
            Import from Ticket
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={!selectedProperty}
          >
            Create Task
          </Button>
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

      {!selectedProperty ? (
        <Alert severity="info">Please select a property to view tasks</Alert>
      ) : loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Task ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.task_id}>
                  <TableCell>{task.task_id}</TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.description}</TableCell>
                  <TableCell>
                    {auth.role !== 'user' ? (
                      <Select
                        value={task.assigned_to_id || ''}
                        onChange={(e) => handleAssigneeChange(task.task_id, e.target.value)}
                        size="small"
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="">
                          <em>Unassigned</em>
                        </MenuItem>
                        {users.map(user => (
                          <MenuItem key={user.user_id} value={user.user_id}>
                            {user.username}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      users.find(u => u.user_id === task.assigned_to_id)?.username || 'Unassigned'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={task.status}
                      color={getStatusColor(task.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={task.priority}
                      color={
                        task.priority === 'Critical' ? 'error' :
                        task.priority === 'High' ? 'warning' :
                        task.priority === 'Medium' ? 'info' :
                        'success'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.task_id, e.target.value)}
                        size="small"
                        sx={{ minWidth: 120 }}
                      >
                        {statuses.map(status => (
                          <MenuItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                      <IconButton
                        onClick={() => handleOpenDialog(task)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
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
                value={taskForm.assigned_to_id}
                onChange={(e) => setTaskForm({ ...taskForm, assigned_to_id: e.target.value })}
                label="Assigned To"
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.user_id} value={user.user_id}>
                    {user.username}
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleCreateOrEdit} variant="contained" color="primary">
            {editingTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import from Ticket Dialog */}
      <Dialog 
        open={openImportDialog} 
        onClose={() => setOpenImportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Task from Ticket</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.ticket_id}>
                    <TableCell>{ticket.ticket_id}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
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
                        label={ticket.status}
                        color={getStatusColor(ticket.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleImportTicket(ticket)}
                      >
                        Import
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewTasks;
