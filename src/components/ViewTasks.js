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
  InputLabel
} from "@mui/material";
import { useAuth } from '../context/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';

const ViewTasks = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [assignTask, setAssignTask] = useState({
    ticket_id: '',
    user_id: ''
  });

  const taskStatuses = ['Pending', 'In Progress', 'Completed'];

  useEffect(() => {
    fetchProperties();
  }, [auth]);

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
    if (selectedProperty) {
      fetchData();
    }
  }, [selectedProperty]);

  const fetchData = async () => {
    try {
      let tasksEndpoint = `/properties/${selectedProperty}/tasks`;
      let usersEndpoint = `/properties/${selectedProperty}/users`;

      const [tasksResponse, usersResponse] = await Promise.all([
        apiClient.get(tasksEndpoint),
        apiClient.get(usersEndpoint)
      ]);

      setTasks(tasksResponse.data.tasks);
      setUsers(usersResponse.data.users);
    } catch (error) {
      setError('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssigneeChange = async (taskId, newUserId) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { assigned_to_user_id: newUserId });
      setTasks(tasks.map(task => 
        task.task_id === taskId ? { ...task, assigned_to_user_id: newUserId } : task
      ));
      setMessage('Task assigned successfully');
      fetchData(); // Refresh data to get updated assignee name
    } catch (error) {
      setError('Failed to update task assignee');
      console.error(error);
    }
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'In Progress':
        return 'info';
      case 'Completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleQuickAction = async (taskId, currentStatus) => {
    let newStatus;
    switch (currentStatus) {
      case 'Pending':
        newStatus = 'In Progress';
        break;
      case 'In Progress':
        newStatus = 'Completed';
        break;
      case 'Completed':
        newStatus = 'In Progress';
        break;
      default:
        newStatus = 'Pending';
    }
    await handleStatusChange(taskId, newStatus);
  };

  const handleAssignTask = async () => {
    try {
      await apiClient.post('/assign-task', {
        ticket_id: assignTask.ticket_id,
        user_id: assignTask.user_id
      });
      setMessage('Task assigned successfully');
      fetchData(); // Refresh task list
      setAssignTask({ ticket_id: '', user_id: '' });
    } catch (error) {
      setError('Failed to assign task');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Tasks
      </Typography>
      
      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Task ID</TableCell>
              <TableCell>Ticket Details</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.task_id}>
                <TableCell>{task.task_id}</TableCell>
                <TableCell>
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      component="a"
                      sx={{ 
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                      onClick={() => navigate(`/tickets/${task.ticket_id}`)}
                    >
                      Ticket #{task.ticket_id}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {task.ticket_title}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={task.ticket_priority}
                      color={
                        task.ticket_priority === 'Critical' ? 'error' :
                        task.ticket_priority === 'High' ? 'warning' :
                        task.ticket_priority === 'Medium' ? 'info' :
                        'success'
                      }
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  {auth.role !== 'user' ? (
                    <Select
                      value={task.assigned_to_user_id || ''}
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
                    task.assigned_to || 'Unassigned'
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={task.status}
                    color={getStatusColor(task.status)}
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
                      {taskStatuses.map(status => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                    <IconButton
                      onClick={() => handleQuickAction(task.task_id, task.status)}
                      color={task.status === 'Completed' ? 'success' : 'primary'}
                      size="small"
                    >
                      {task.status === 'Completed' ? 
                        <CheckCircleIcon /> : 
                        <PauseCircleIcon />
                      }
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Add Task Assignment Section */}
      {auth.role !== 'user' && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Assign Task
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Ticket</InputLabel>
                <Select
                  value={assignTask.ticket_id}
                  onChange={(e) => setAssignTask(prev => ({ ...prev, ticket_id: e.target.value }))}
                >
                  {tasks.map(task => (
                    <MenuItem key={task.ticket_id} value={task.ticket_id}>
                      {task.ticket_title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Assign To</InputLabel>
                <Select
                  value={assignTask.user_id}
                  onChange={(e) => setAssignTask(prev => ({ ...prev, user_id: e.target.value }))}
                >
                  {users.map(user => (
                    <MenuItem key={user.user_id} value={user.user_id}>
                      {user.username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                onClick={handleAssignTask}
                disabled={!assignTask.ticket_id || !assignTask.user_id}
              >
                Assign Task
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default ViewTasks;
