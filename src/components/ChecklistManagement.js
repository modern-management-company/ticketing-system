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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';

const ChecklistManagement = () => {
  const { auth } = useAuth();
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [checklistForm, setChecklistForm] = useState({
    title: '',
    description: '',
    checklist_type: 'daily',
    department: '',
    property_id: '',
    items: []
  });
  const [properties, setProperties] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checklistTypes = ['daily', 'weekly', 'monthly', 'custom'];
  const departments = ['Engineering', 'Housekeeping', 'Front Desk', 'Management', 'IT', 'Security', 'Food & Beverage'];

  useEffect(() => {
    fetchChecklists();
    fetchProperties();
  }, []);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/checklists');
      setChecklists(response.data.checklists || []);
    } catch (error) {
      setError('Failed to fetch checklists');
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/properties');
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleOpenDialog = (checklist = null) => {
    if (checklist) {
      setEditingChecklist(checklist);
      setChecklistForm({
        title: checklist.title,
        description: checklist.description || '',
        checklist_type: checklist.checklist_type,
        department: checklist.department,
        property_id: checklist.property_id || '',
        items: checklist.items || []
      });
    } else {
      setEditingChecklist(null);
      setChecklistForm({
        title: '',
        description: '',
        checklist_type: 'daily',
        department: '',
        property_id: '',
        items: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingChecklist(null);
    setChecklistForm({
      title: '',
      description: '',
      checklist_type: 'daily',
      department: '',
      property_id: '',
      items: []
    });
  };

  const handleSubmit = async () => {
    if (!checklistForm.title || !checklistForm.department) {
      setError('Title and department are required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingChecklist) {
        await apiClient.put(`/api/checklists/${editingChecklist.checklist_id}`, checklistForm);
      } else {
        await apiClient.post('/api/checklists', checklistForm);
      }
      
      fetchChecklists();
      handleCloseDialog();
      setError(null);
    } catch (error) {
      setError('Failed to save checklist');
      console.error('Error saving checklist:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    if (window.confirm('Are you sure you want to delete this checklist?')) {
      try {
        await apiClient.delete(`/api/checklists/${checklistId}`);
        fetchChecklists();
      } catch (error) {
        setError('Failed to delete checklist');
        console.error('Error deleting checklist:', error);
      }
    }
  };

  const handleCompleteChecklist = async (checklistId) => {
    try {
      await apiClient.post(`/api/checklists/${checklistId}/complete`, {
        notes: 'Completed via checklist management'
      });
      fetchChecklists();
    } catch (error) {
      setError('Failed to complete checklist');
      console.error('Error completing checklist:', error);
    }
  };

  const addItem = () => {
    setChecklistForm(prev => ({
      ...prev,
      items: [...prev.items, { description: '', is_required: true, expected_duration: '', notes: '' }]
    }));
  };

  const updateItem = (index, field, value) => {
    setChecklistForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index) => {
    setChecklistForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Checklist Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Checklist
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {checklists.map((checklist) => (
          <Grid item xs={12} md={6} lg={4} key={checklist.checklist_id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h2">
                    {checklist.title}
                  </Typography>
                  <Chip 
                    label={checklist.checklist_type} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </Box>
                
                <Typography color="textSecondary" gutterBottom>
                  {checklist.description}
                </Typography>
                
                <Box display="flex" gap={1} mb={2}>
                  <Chip label={checklist.department} size="small" />
                  <Chip 
                    label={`${checklist.item_count} items`} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>

                <Typography variant="body2" color="textSecondary">
                  Created by: {checklist.created_by_username}
                </Typography>
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenDialog(checklist)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleCompleteChecklist(checklist.checklist_id)}
                >
                  Complete
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeleteChecklist(checklist.checklist_id)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingChecklist ? 'Edit Checklist' : 'Create New Checklist'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title"
                value={checklistForm.title}
                onChange={(e) => setChecklistForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Checklist Type</InputLabel>
                <Select
                  value={checklistForm.checklist_type}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, checklist_type: e.target.value }))}
                  label="Checklist Type"
                >
                  {checklistTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={checklistForm.department}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, department: e.target.value }))}
                  label="Department"
                  required
                >
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Property (Optional)</InputLabel>
                <Select
                  value={checklistForm.property_id}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, property_id: e.target.value }))}
                  label="Property (Optional)"
                >
                  <MenuItem value="">All Properties</MenuItem>
                  {properties.map(property => (
                    <MenuItem key={property.property_id} value={property.property_id}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={checklistForm.description}
                onChange={(e) => setChecklistForm(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Checklist Items</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={addItem}
              variant="outlined"
              size="small"
            >
              Add Item
            </Button>
          </Box>

          {checklistForm.items.map((item, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Duration (min)"
                    type="number"
                    value={item.expected_duration}
                    onChange={(e) => updateItem(index, 'expected_duration', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={item.is_required}
                        onChange={(e) => updateItem(index, 'is_required', e.target.checked)}
                      />
                    }
                    label="Required"
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <IconButton
                    color="error"
                    onClick={() => removeItem(index)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    value={item.notes}
                    onChange={(e) => updateItem(index, 'notes', e.target.value)}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : (editingChecklist ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChecklistManagement; 