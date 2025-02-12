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
import PropertySwitcher from './PropertySwitcher';

const ViewTasks = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (selectedProperty) {
      fetchData();
    }
  }, [selectedProperty]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tasksResponse, usersResponse] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tasks`),
        apiClient.get('/users')
      ]);

      if (tasksResponse.data && Array.isArray(tasksResponse.data.tasks)) {
        setTasks(tasksResponse.data.tasks);
      } else if (tasksResponse.data && Array.isArray(tasksResponse.data)) {
        setTasks(tasksResponse.data);
      } else {
        setTasks([]);
        console.warn('No tasks data available or invalid format');
      }

      if (usersResponse.data && Array.isArray(usersResponse.data.users)) {
        setUsers(usersResponse.data.users);
      } else if (usersResponse.data && Array.isArray(usersResponse.data)) {
        setUsers(usersResponse.data);
      } else {
        setUsers([]);
        console.warn('No users data available or invalid format');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to fetch tasks and users');
      setTasks([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  const handleAssigneeChange = async (taskId, newUserId) => {
    try {
      if (!auth?.token) {
        throw new Error('Authentication required');
      }

      await apiClient.patch(`/tasks/${taskId}`, { assigned_to_id: newUserId });
      setSuccess('Task assigned successfully');
      await fetchData();
    } catch (error) {
      console.error('Failed to update task assignee:', error);
      setError(error.message || 'Failed to update task assignee');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map(task => 
        task.task_id === taskId ? { ...task, status: newStatus } : task
      ));
      setSuccess('Task status updated successfully');
    } catch (error) {
      setError('Failed to update task status');
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
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

  const handleQuickAction = async (taskId, currentStatus) => {
    let newStatus;
    switch (currentStatus.toLowerCase()) {
      case 'pending':
        newStatus = 'In Progress';
        break;
      case 'in progress':
        newStatus = 'Completed';
        break;
      case 'completed':
        newStatus = 'In Progress';
        break;
      default:
        newStatus = 'Pending';
    }
    await handleStatusChange(taskId, newStatus);
  };

  if (loading && !selectedProperty) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Tasks</Typography>
        <PropertySwitcher onPropertyChange={handlePropertyChange} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {selectedProperty ? (
        loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.task_id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{task.title}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {task.description}
                        </Typography>
                      </Box>
                    </TableCell>
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
                          {['Pending', 'In Progress', 'Completed'].map(status => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                        <IconButton
                          onClick={() => handleQuickAction(task.task_id, task.status)}
                          color={task.status.toLowerCase() === 'completed' ? 'success' : 'primary'}
                          size="small"
                        >
                          {task.status.toLowerCase() === 'completed' ? 
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
        )
      ) : (
        <Alert severity="info">Please select a property to view tasks</Alert>
      )}
    </Box>
  );
};

export default ViewTasks;
