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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

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
      const [tasksResponse, usersResponse] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tasks`),
        apiClient.get(`/properties/${selectedProperty}/users`)
      ]);

      if (tasksResponse.data?.tasks) {
        setTasks(tasksResponse.data.tasks);
      }
      if (usersResponse.data?.users) {
        setUsers(usersResponse.data.users);
      }
      setError(null);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssigneeChange = async (taskId, newUserId) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { assigned_to_id: newUserId });
      setMessage('Task assigned successfully');
      await fetchData();
    } catch (error) {
      console.error('Failed to update task assignee:', error);
      setError(error.response?.data?.message || 'Failed to update task assignee');
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

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Tasks</Typography>
        <PropertySwitcher onPropertyChange={handlePropertyChange} />
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
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="In Progress">In Progress</MenuItem>
                        <MenuItem value="Completed">Completed</MenuItem>
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
      )}
    </Box>
  );
};

export default ViewTasks;
