import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Apartment as PropertyIcon,
  Group as TeamIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  SupervisorAccount as ManagerIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';

const TeamManagement = () => {
  const { auth } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    phone: '',
    role: 'user',
    group: '',
    is_active: true,
    password: '',
    assigned_properties: []
  });
  const [editingUser, setEditingUser] = useState(null);
  const [propertyTeam, setPropertyTeam] = useState([]);
  const [departments, setDepartments] = useState(['Maintenance', 'Housekeeping', 'Front Desk', 'Security', 'Engineering']);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/properties/managed');
      
      if (response.data && Array.isArray(response.data)) {
        setProperties(response.data);
        
        // If we have properties, select the first one by default
        if (response.data.length > 0 && !selectedProperty) {
          setSelectedProperty(response.data[0].property_id);
          // Fetch team for the first property
          await fetchPropertyTeam(response.data[0].property_id);
        } else if (response.data.length === 0) {
          setLoading(false);
        }
      } else {
        setError('Failed to load property data: Invalid response format');
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setError(error.response?.data?.message || 'Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyTeam = async (propertyId) => {
    if (!propertyId) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log(`Fetching team for property ID: ${propertyId}`);
      const response = await apiClient.get(`/properties/${propertyId}/team`);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('Team members received:', response.data);
        setPropertyTeam(response.data);
      } else {
        console.error('Invalid property team data format:', response.data);
        setError('Failed to load property team: Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch property team:', error);
      setError(error.response?.data?.message || 'Failed to load property team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
    fetchPropertyTeam(propertyId);
  };

  const resetUserForm = () => {
    setUserFormData({
      username: '',
      email: '',
      phone: '',
      role: 'user',
      group: '',
      is_active: true,
      password: '',
      assigned_properties: selectedProperty ? [selectedProperty] : []
    });
    setEditingUser(null);
  };

  const handleEditUser = (user) => {
    setUserFormData({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      group: user.group || '',
      is_active: true, // Default since the /users endpoint doesn't return is_active
      password: '',
      assigned_properties: selectedProperty ? [selectedProperty] : []
    });
    setEditingUser(user);
    setOpenUserDialog(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user from your team?')) return;
    
    try {
      await apiClient.delete(`/users/${userId}`);
      setSuccess('User successfully removed from team');
      fetchPropertyTeam(selectedProperty);
    } catch (error) {
      console.error('Failed to delete user:', error);
      setError(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userFormData.username || !userFormData.email) {
      setError('Username and email are required fields');
      return;
    }
    
    if (!editingUser && !userFormData.password) {
      setError('Password is required for new users');
      return;
    }
    
    try {
      const payload = {
        username: userFormData.username,
        email: userFormData.email,
        phone: userFormData.phone,
        role: userFormData.role,
        group: userFormData.group,
        is_active: userFormData.is_active,
        assigned_properties: userFormData.assigned_properties
      };
      
      if (!editingUser) {
        payload.password = userFormData.password;
      }
      
      let response;
      if (editingUser) {
        response = await apiClient.put(`/users/${userFormData.user_id}`, payload);
        setSuccess('User updated successfully');
      } else {
        response = await apiClient.post('/users', payload);
        setSuccess('User added to team successfully');
      }
      
      fetchPropertyTeam(selectedProperty);
      setOpenUserDialog(false);
      resetUserForm();
    } catch (error) {
      console.error('Failed to save user:', error);
      setError(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handlePropertyAssignment = async (userId, propertyIds) => {
    try {
      await apiClient.post('/assign-property', {
        user_id: userId,
        property_ids: propertyIds
      });
      setSuccess('User property assignments updated successfully');
      fetchPropertyTeam(selectedProperty);
    } catch (error) {
      console.error('Failed to update user property assignments:', error);
      setError(error.response?.data?.message || 'Failed to update user property assignments');
    }
  };

  const filterTeamByGroup = (group) => {
    return propertyTeam.filter(user => user.group === group);
  };

  const getManagersForProperty = () => {
    return propertyTeam.filter(user => 
      user.role === 'manager' || user.role === 'general_manager'
    );
  };

  if (loading && properties.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Team Management</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchPropertyTeam(selectedProperty)}
            sx={{ mr: 2 }}
          >
            Refresh Team
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => {
              resetUserForm();
              setOpenUserDialog(true);
            }}
          >
            Add Team Member
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {properties.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Select Property</InputLabel>
            <Select
              value={selectedProperty || ''}
              onChange={(e) => handlePropertyChange(e.target.value)}
              label="Select Property"
            >
              {properties.map((property) => (
                <MenuItem key={property.property_id} value={property.property_id}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          You don't have any properties assigned. Contact an administrator to assign properties to you.
        </Alert>
      )}

      {selectedProperty && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Team Members for {properties.find(p => p.property_id === selectedProperty)?.name || 'Selected Property'}
          </Typography>

          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
            <Tab label="All Team Members" />
            <Tab label="By Department" />
            <Tab label="Property Managers" />
          </Tabs>

          {activeTab === 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress size={30} sx={{ my: 2 }} />
                      </TableCell>
                    </TableRow>
                  ) : propertyTeam.length > 0 ? (
                    propertyTeam.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EmailIcon fontSize="small" color="action" />
                              <Typography variant="body2">{user.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            color={user.role === 'manager' || user.role === 'general_manager' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {user.group ? (
                            <Chip label={user.group} variant="outlined" size="small" />
                          ) : (
                            <Typography variant="body2" color="text.secondary">Not assigned</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="Active"
                            color="success"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleEditUser(user)} size="small" color="primary">
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteUser(user.user_id)} size="small" color="error">
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Alert severity="info">No team members assigned to this property.</Alert>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 1 && (
            <Grid container spacing={3}>
              {departments.map((department) => (
                <Grid item xs={12} md={6} key={department}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>{department}</Typography>
                      <Divider sx={{ mb: 2 }} />
                      {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                          <CircularProgress size={30} />
                        </Box>
                      ) : filterTeamByGroup(department).length > 0 ? (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filterTeamByGroup(department).map((user) => (
                                <TableRow key={user.user_id}>
                                  <TableCell>{user.username}</TableCell>
                                  <TableCell>{user.email}</TableCell>
                                  <TableCell>
                                    <IconButton onClick={() => handleEditUser(user)} size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No team members in this department
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 2 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Property</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <CircularProgress size={30} sx={{ my: 2 }} />
                      </TableCell>
                    </TableRow>
                  ) : getManagersForProperty().length > 0 ? (
                    getManagersForProperty().map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ManagerIcon color="primary" />
                            <Typography>{user.username}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role === 'general_manager' ? 'General Manager' : 'Manager'}
                            color="primary"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {properties.find(p => p.property_id === selectedProperty)?.name || 'Unknown'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Alert severity="info">No managers assigned to this property.</Alert>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* User Dialog */}
      <Dialog open={openUserDialog} onClose={() => {
        setOpenUserDialog(false);
        resetUserForm();
      }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit Team Member' : 'Add New Team Member'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Username"
              value={userFormData.username}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Phone"
              value={userFormData.phone}
              onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
            />
            {!editingUser && (
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                required
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                {auth.user?.role === 'super_admin' && (
                  <MenuItem value="general_manager">General Manager</MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={userFormData.group}
                onChange={(e) => setUserFormData({ ...userFormData, group: e.target.value })}
                label="Department"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={userFormData.is_active}
                onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.value })}
                label="Status"
              >
                <MenuItem value={true}>Active</MenuItem>
                <MenuItem value={false}>Pending</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Assigned Properties</InputLabel>
              <Select
                multiple
                value={userFormData.assigned_properties}
                onChange={(e) => setUserFormData({ ...userFormData, assigned_properties: e.target.value })}
                label="Assigned Properties"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((propertyId) => {
                      const property = properties.find(p => p.property_id === propertyId);
                      return (
                        <Chip
                          key={propertyId}
                          label={property ? property.name : 'Unknown'}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {properties.map((property) => (
                  <MenuItem key={property.property_id} value={property.property_id}>
                    {property.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenUserDialog(false);
            resetUserForm();
          }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingUser ? 'Update' : 'Add'} Team Member
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManagement; 