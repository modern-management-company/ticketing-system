import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  MenuItem
} from '@mui/material';
import apiClient from './apiClient';
import PropertySwitcher from './PropertySwitcher';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Pending'
  });

  useEffect(() => {
    if (selectedProperty) {
      fetchTasks();
    }
  }, [selectedProperty]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/properties/${selectedProperty}/tasks`);
      if (response.data && Array.isArray(response.data.tasks)) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  const handleAddTask = async () => {
    try {
      setError(null);
      setSuccess(null);
      const response = await apiClient.post(`/properties/${selectedProperty}/tasks`, taskFormData);
      if (response.data && response.data.task) {
        setSuccess('Task added successfully');
        await fetchTasks();
        setOpenDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add task:', error);
      setError('Failed to add task');
    }
  };

  const resetForm = () => {
    setTaskFormData({
      title: '',
      description: '',
      priority: 'Medium',
      status: 'Pending'
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading && !selectedProperty) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Task Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <PropertySwitcher onPropertyChange={handlePropertyChange} />
          {selectedProperty && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleOpenDialog}
            >
              Add Task
            </Button>
          )}
        </Box>
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
                  <TableCell>Title</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.task_id}>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>{task.description}</TableCell>
                    <TableCell>
                      <Chip 
                        label={task.priority} 
                        color={getPriorityColor(task.priority)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={task.status} 
                        color={task.status === 'Completed' ? 'success' : 'default'}
                      />
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

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Task Title"
              value={taskFormData.title}
              onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={taskFormData.description}
              onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              fullWidth
              multiline
              rows={4}
            />
            <TextField
              select
              label="Priority"
              value={taskFormData.priority}
              onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
              fullWidth
            >
              {['Low', 'Medium', 'High'].map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained" color="primary">
            Add Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tasks; 