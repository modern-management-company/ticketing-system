import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Tooltip,
  Card,
  CardContent,
  CardActions,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup
} from "@mui/material";
import { useAuth } from '../context/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import AddIcon from '@mui/icons-material/Add';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import PropertySwitcher from './PropertySwitcher';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import { useIsMobile } from '../hooks/useIsMobile';
import CloseIcon from '@mui/icons-material/Close';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TableViewIcon from '@mui/icons-material/TableView';
import KanbanBoard from './TasksKanbanBoard';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RestoreIcon from '@mui/icons-material/Restore';

const ViewTasks = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    assigned_to_id: '',
    due_date: null,
    ticket_id: null
  });
  const [openDueDatePicker, setOpenDueDatePicker] = useState(false);
  const [managers, setManagers] = useState([]);
  const isMobile = useIsMobile();
  const [orderBy, setOrderBy] = useState('task_id');
  const [order, setOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('table');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const statuses = ['pending', 'in progress', 'completed'];

  useEffect(() => {
    if (auth?.assigned_properties?.length > 0) {
      const defaultProperty = auth.assigned_properties[0].property_id;
      console.log('Setting default property:', defaultProperty);
      setSelectedProperty(defaultProperty);
    }
  }, [auth]);

  useEffect(() => {
    if (selectedProperty) {
      console.log('Selected property changed, fetching data...');
      fetchTasks();
    }
  }, [selectedProperty]);

  useEffect(() => {
    if (location.state?.createTask) {
      const { ticketId, propertyId } = location.state;
      
      // Set the selected property
      if (propertyId) {
        setSelectedProperty(propertyId);
      }
      
      // Pre-populate form data
      if (ticketId) {
        setTaskForm(prev => ({
          ...prev,
          ticket_id: ticketId
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

  const fetchTasks = async () => {
    try {
      if (!auth?.token || !selectedProperty) {
        return;
      }

      setLoading(true);
      console.log('Fetching data for property:', selectedProperty);

      const [tasksResponse, usersResponse, ticketsResponse, managersResponse] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tasks`),
        apiClient.get(`/properties/${selectedProperty}/users`),
        apiClient.get(`/properties/${selectedProperty}/tickets`),
        apiClient.get(`/properties/${selectedProperty}/managers`)
      ]);

      console.log('Tasks response:', tasksResponse.data);

      if (tasksResponse.data?.tasks) {
        // Log task details with ticket and room information
        console.log('Tasks with ticket info:', tasksResponse.data.tasks.map(task => ({
          task_id: task.task_id,
          ticket_id: task.ticket_id,
          room_info: task.room_info,
          title: task.title
        })));
        
        setTasks(tasksResponse.data.tasks);
      } else {
        console.warn('No tasks data in response');
        setTasks([]);
      }

      if (usersResponse.data?.users) {
        setUsers(usersResponse.data.users);
      } else {
        console.warn('No users data in response');
        setUsers([]);
      }

      if (ticketsResponse.data?.tickets) {
        setTickets(ticketsResponse.data.tickets);
      } else {
        console.warn('No tickets data in response');
        setTickets([]);
      }

      if (managersResponse.data?.managers) {
        setManagers(managersResponse.data.managers);
      } else {
        console.warn('No managers data in response');
        setManagers([]);
      }

      setError(null);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportTicket = (ticket) => {
    console.log('Importing ticket:', ticket);
    setTaskForm({
      title: `[Ticket #${ticket.ticket_id}] ${ticket.title}`,
      description: ticket.description,
      priority: ticket.priority,
      status: 'pending',
      assigned_to_id: '',
      ticket_id: ticket.ticket_id,
      due_date: null
    });
    setOpenImportDialog(false);
    setOpenDialog(true);
  };

  const handleCreateOrEdit = async () => {
    try {
      if (isSubmitting) return;
      
      if (!selectedProperty) {
        setError('Please select a property first');
        return;
      }

      // Validate required fields
      if (!taskForm.title.trim()) {
        setError('Title is required');
        return;
      }
      if (!taskForm.description.trim()) {
        setError('Description is required');
        return;
      }

      setIsSubmitting(true);
      console.log('Creating/Editing task with data:', {
        ...taskForm,
        property_id: selectedProperty
      });

      const taskData = {
        ...taskForm,
        property_id: selectedProperty
      };

      if (editingTask) {
        const response = await apiClient.patch(`/tasks/${editingTask.task_id}`, taskData);
        if (response.data?.msg) {
          setMessage(response.data.msg);
        } else {
          setMessage('Task updated successfully');
        }
      } else {
        const response = await apiClient.post('/tasks', taskData);
        if (response.data?.msg) {
          setMessage(response.data.msg);
        } else {
          setMessage('Task created successfully');
        }
      }
      await fetchTasks();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save task:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.msg || error.response?.data?.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
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
        assigned_to_id: task.assigned_to_id || '',
        due_date: task.due_date ? new Date(task.due_date) : null,
        ticket_id: task.ticket_id || null
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        priority: 'Low',
        status: 'pending',
        assigned_to_id: '',
        due_date: null,
        ticket_id: null
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
      assigned_to_id: '',
      due_date: null,
      ticket_id: null
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
    console.log('Property changed to:', propertyId);
    setSelectedProperty(propertyId);
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm(`Are you sure you want to delete this task?`)) {
      try {
        setError(null);
        setMessage(null);
        setLoading(true);
        
        const response = await apiClient.delete(`/tasks/${taskId}`);
        
        if (response.status === 200) {
          setMessage('Task deleted successfully');
          setTasks(prevTasks => prevTasks.filter(t => t.task_id !== taskId));
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        setError(error.response?.data?.msg || 'Failed to delete task');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortTasks = (tasks) => {
    return [...tasks].sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Special handling for room sorting
      if (orderBy === 'room_name') {
        aValue = a.room_info?.room_name || '';
        bValue = b.room_info?.room_name || '';
      } else if (orderBy === 'assigned_to') {
        aValue = users.find(u => u.user_id === a.assigned_to_id)?.username || '';
        bValue = users.find(u => u.user_id === b.assigned_to_id)?.username || '';
      } else if (orderBy === 'group') {
        aValue = users.find(u => u.user_id === a.assigned_to_id)?.group || '';
        bValue = users.find(u => u.user_id === b.assigned_to_id)?.group || '';
      } else if (orderBy === 'due_date') {
        aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
        bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
      } else if (orderBy === 'ticket_id') {
        aValue = a.ticket_id || 0;
        bValue = b.ticket_id || 0;
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

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const isCompleted = task.status.toLowerCase() === 'completed';
      return showCompleted ? isCompleted : !isCompleted;
    });
  }, [tasks, showCompleted]);

  const handleArchiveTask = async (taskId) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { 
        status: 'completed',
        archived_at: new Date().toISOString()
      });
      await fetchTasks();
      setMessage('Task archived successfully');
    } catch (error) {
      setError('Failed to archive task');
    }
  };

  const TaskCard = ({ task }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{task.title}</Typography>
        <Typography color="textSecondary" gutterBottom>ID: {task.task_id}</Typography>
        <Typography variant="body2" paragraph>{task.description}</Typography>
        
        <Grid container spacing={1} sx={{ mb: 1 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Status</Typography>
            <Chip 
              label={task.status}
              color={getStatusColor(task.status)}
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Priority</Typography>
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
        </Grid>

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Room</Typography>
            {task.room_info ? (
              <Tooltip title={`From Ticket #${task.room_info.ticket_id}`}>
                <Chip 
                  label={task.room_info.room_name}
                  size="small"
                  color="info"
                  variant="outlined"
                  onClick={() => task.ticket_id && window.confirm(`View ticket #${task.ticket_id}?`) && navigate(`/tickets/${task.ticket_id}`)}
                />
              </Tooltip>
            ) : (
              <Typography variant="body2">N/A</Typography>
            )}
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Linked Ticket</Typography>
            {task.ticket_id ? (
              <Chip
                label={`Ticket #${task.ticket_id}`}
                size="small"
                color="secondary"
                variant="outlined"
                onClick={() => navigate(`/tickets/${task.ticket_id}`)}
                sx={{ cursor: 'pointer' }}
              />
            ) : (
              <Typography variant="body2">N/A</Typography>
            )}
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Assigned To</Typography>
            <Typography variant="body2">
              {users.find(u => u.user_id === task.assigned_to_id)?.username || 'Unassigned'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Due Date</Typography>
            <Typography variant="body2">
              {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions>
        <Button
          startIcon={<EditIcon />}
          onClick={() => handleOpenDialog(task)}
          size="small"
        >
          Edit
        </Button>
        {(auth?.user?.role === 'super_admin' || 
          managers.some(m => m.user_id === auth?.user?.user_id)) && (
          <Button
            startIcon={<DeleteIcon />}
            onClick={() => handleDeleteTask(task.task_id)}
            size="small"
            color="error"
          >
            Delete
          </Button>
        )}
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">
            {showCompleted ? 'Completed Tasks' : 'Active Tasks'}
          </Typography>
          <ToggleButtonGroup
            value={showCompleted}
            exclusive
            onChange={(e, value) => setShowCompleted(value)}
            size="small"
          >
            <ToggleButton value={false}>
              <Tooltip title="View Active Tasks">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon />
                  Active
                </Box>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value={true}>
              <Tooltip title="View Completed Tasks">
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
          {!showCompleted && (
            <>
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
            </>
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

      {!selectedProperty ? (
        <Alert severity="info">Please select a property to view tasks</Alert>
      ) : loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {viewMode === 'kanban' ? (
            <KanbanBoard
              tasks={filteredTasks}
              users={users}
              onTaskMove={handleStatusChange}
              onEditTask={handleOpenDialog}
              onDeleteTask={handleDeleteTask}
              canEdit={auth?.user?.role === 'super_admin' || managers.some(m => m.user_id === auth?.user?.user_id)}
            />
          ) : isMobile ? (
            <Box sx={{ mt: 2 }}>
              {filteredTasks.map((task) => (
                <TaskCard key={task.task_id} task={task} />
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'task_id'}
                        direction={orderBy === 'task_id' ? order : 'asc'}
                        onClick={() => handleRequestSort('task_id')}
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
                        active={orderBy === 'room_name'}
                        direction={orderBy === 'room_name' ? order : 'asc'}
                        onClick={() => handleRequestSort('room_name')}
                      >
                        Room
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'ticket_id'}
                        direction={orderBy === 'ticket_id' ? order : 'asc'}
                        onClick={() => handleRequestSort('ticket_id')}
                      >
                        Linked Ticket
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
                        active={orderBy === 'due_date'}
                        direction={orderBy === 'due_date' ? order : 'asc'}
                        onClick={() => handleRequestSort('due_date')}
                      >
                        Due Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'assigned_to'}
                        direction={orderBy === 'assigned_to' ? order : 'asc'}
                        onClick={() => handleRequestSort('assigned_to')}
                      >
                        Assigned To
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'group'}
                        direction={orderBy === 'group' ? order : 'asc'}
                        onClick={() => handleRequestSort('group')}
                      >
                        Group
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortTasks(filteredTasks).map((task) => (
                    <TableRow key={task.task_id}>
                      <TableCell>{task.task_id}</TableCell>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>
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
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {task.ticket_id ? (
                          <Chip 
                            label={`Ticket #${task.ticket_id}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            onClick={() => navigate(`/tickets/${task.ticket_id}`)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={task.status}
                          color={
                            task.status.toLowerCase() === 'pending' ? 'warning' :
                            task.status.toLowerCase() === 'in progress' ? 'info' :
                            task.status.toLowerCase() === 'completed' ? 'success' :
                            'default'
                          }
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
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {users.find(u => u.user_id === task.assigned_to_id)?.username || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={users.find(u => u.user_id === task.assigned_to_id)?.group || 'N/A'} 
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {!showCompleted ? (
                            <>
                              <Button
                                startIcon={<EditIcon />}
                                onClick={() => handleOpenDialog(task)}
                                size="small"
                              >
                                Edit
                              </Button>
                              <Button
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleStatusChange(task.task_id, 'completed')}
                                size="small"
                                color="success"
                              >
                                Mark Complete
                              </Button>
                              {(auth?.user?.role === 'super_admin' || 
                                managers.some(m => m.user_id === auth?.user?.user_id)) && (
                                <Button
                                  startIcon={<DeleteIcon />}
                                  onClick={() => handleDeleteTask(task.task_id)}
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
                              onClick={() => handleStatusChange(task.task_id, 'pending')}
                              size="small"
                              color="primary"
                            >
                              Reopen
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Create New Task'}
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
                {tickets.length > 0 ? (
                  tickets
                    .filter(ticket => ticket.status.toLowerCase() !== 'completed' || ticket.ticket_id === taskForm.ticket_id)
                    .map((ticket) => (
                      <MenuItem key={ticket.ticket_id} value={ticket.ticket_id}>
                        #{ticket.ticket_id}: {ticket.title.substring(0, 50)}{ticket.title.length > 50 ? '...' : ''}
                      </MenuItem>
                    ))
                ) : (
                  <MenuItem disabled>
                    <em>No tickets available</em>
                  </MenuItem>
                )}
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
            {isSubmitting ? 'Submitting...' : (editingTask ? 'Update' : 'Create')}
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
          <Alert severity="info" sx={{ mb: 2 }}>
            Only active tickets that haven't been linked to tasks are shown. Completed tickets and tickets that already have associated tasks are filtered out.
          </Alert>
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
                {tickets
                  .filter(ticket => 
                    // Filter out completed tickets
                    ticket.status.toLowerCase() !== 'completed' && 
                    // Filter out tickets that are already imported (have associated tasks)
                    !tasks.some(task => task.ticket_id === ticket.ticket_id)
                  )
                  .map((ticket) => (
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
                {tickets.filter(ticket => 
                  ticket.status.toLowerCase() !== 'completed' && 
                  !tasks.some(task => task.ticket_id === ticket.ticket_id)
                ).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                        No tickets available for import. All tickets are either completed or already imported.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
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
