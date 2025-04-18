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
import PropertySwitcher from './PropertySwitcher';

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
      
      const response = await apiClient.get('/properties');
      console.log('Properties response:', response.data);
      
      let processedProperties = [];
      
      // Handle different response formats
      if (response.data && response.data.properties && Array.isArray(response.data.properties)) {
        // Format: { properties: [...] }
        processedProperties = response.data.properties.map(prop => ({
          property_id: prop.property_id,
          name: prop.name,
          address: prop.address,
          type: prop.type,
          status: prop.status
        }));
      } else if (response.data && Array.isArray(response.data)) {
        // Format: Direct array of properties
        processedProperties = response.data.map(prop => ({
          property_id: prop.property_id || prop.id,
          name: prop.name,
          address: prop.address,
          type: prop.type,
          status: prop.status
        }));
      } else {
        console.error('Unexpected API response format:', response.data);
        setError('Failed to load property data: Unexpected format');
        setLoading(false);
        return;
      }
      
      console.log('Processed properties:', processedProperties);
      setProperties(processedProperties);
      
      // If we have properties but no selected property, select the first one
      if (processedProperties.length > 0 && !selectedProperty) {
        const firstPropertyId = processedProperties[0].property_id;
        console.log(`Auto-selecting first property: ${firstPropertyId}`);
        setSelectedProperty(firstPropertyId);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      setError(error.response?.data?.message || 'Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyTeam = async (propertyId) => {
    if (!propertyId) {
      console.log('No property ID provided, skipping team fetch');
      return;
    }
    
    console.log(`Fetching team for property ID: ${propertyId}`);
    
    try {
      setLoading(true);
      setError('');
      
      // Start with property users endpoint - skip the team endpoint
      try {
        console.log(`Making API call to /properties/${propertyId}/users`);
        const usersResponse = await apiClient.get(`/properties/${propertyId}/users`);
        console.log('Property users API response:', usersResponse);
        
        if (usersResponse.data && usersResponse.data.users && Array.isArray(usersResponse.data.users)) {
          console.log(`Users received for property ID ${propertyId}:`, usersResponse.data.users);
          setPropertyTeam(usersResponse.data.users);
          setLoading(false);
          return;
        } else if (usersResponse.data && Array.isArray(usersResponse.data)) {
          // Handle case where the response might be a direct array
          console.log(`Users array received for property ID ${propertyId}:`, usersResponse.data);
          setPropertyTeam(usersResponse.data);
          setLoading(false);
          return;
        } else {
          console.error('Invalid property users data format:', usersResponse.data);
        }
      } catch (propertyUsersError) {
        console.error('Property users endpoint failed:', propertyUsersError);
      }
      
      // Fallback: Get all users and filter
      try {
        console.log('Using fallback method: fetching all users and filtering');
        const usersResponse = await apiClient.get('/users');
        console.log('All users response type:', typeof usersResponse.data);
        
        // Check for different possible response formats
        let allUsers = [];
        
        if (Array.isArray(usersResponse.data)) {
          console.log('Users data is an array with length:', usersResponse.data.length);
          allUsers = usersResponse.data;
        } else if (usersResponse.data && typeof usersResponse.data === 'object') {
          // Check if there's a users array property
          if (Array.isArray(usersResponse.data.users)) {
            console.log('Found users array in response with length:', usersResponse.data.users.length);
            allUsers = usersResponse.data.users;
          } else {
            // Try to convert object to array if it has numeric keys
            const potentialUsers = Object.values(usersResponse.data);
            if (potentialUsers.length > 0 && potentialUsers[0] && typeof potentialUsers[0] === 'object') {
              console.log('Converted object to array with length:', potentialUsers.length);
              allUsers = potentialUsers;
            }
          }
        }
        
        if (allUsers.length > 0) {
          console.log('Filtering users for property ID:', propertyId);
          
          // First, make sure property ID is correctly formatted
          const propIdNum = parseInt(propertyId, 10);
          
          // Filter users with assigned_properties containing this property
          const propertyTeamMembers = allUsers.filter(user => {
            if (!user.assigned_properties) {
              return false;
            }
            
            // Handle both array and object formats for assigned_properties
            if (Array.isArray(user.assigned_properties)) {
              return user.assigned_properties.some(prop => {
                // Check different property ID field names
                const propId = prop.property_id || prop.id || null;
                return propId === propertyId || propId === propIdNum;
              });
            } else if (typeof user.assigned_properties === 'object') {
              // If assigned_properties is an object, check its values
              return Object.values(user.assigned_properties).some(prop => {
                const propId = prop.property_id || prop.id || null;
                return propId === propertyId || propId === propIdNum;
              });
            }
            
            return false;
          });
          
          console.log('Filtered team members count:', propertyTeamMembers.length);
          
          if (propertyTeamMembers.length > 0) {
            setPropertyTeam(propertyTeamMembers);
          } else {
            console.log('No team members found with this property assignment');
            setError('No team members found for this property');
          }
        } else {
          console.error('No valid users found in the response');
          setError('No team members found for this property');
        }
      } catch (usersError) {
        console.error('Users fallback failed:', usersError);
        setError('Failed to load team members. Please try again.');
      }
    } catch (error) {
      console.error('Failed to fetch property team:', error);
      setError('Failed to load property team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add a useEffect to fetch team members when selectedProperty changes
  useEffect(() => {
    if (selectedProperty) {
      console.log(`Selected property changed to ${selectedProperty}, fetching team members`);
      fetchPropertyTeam(selectedProperty);
    }
  }, [selectedProperty]);

  // Update the handlePropertyChange function to just set the selected property
  // The useEffect will handle fetching the team
  const handlePropertyChange = (propertyId) => {
    console.log('Property selected from PropertySwitcher:', propertyId);
    setSelectedProperty(propertyId);
    // fetchPropertyTeam is now called by the useEffect
  };

  const resetUserForm = () => {
    // For a new user, make sure we assign them to the current property
    const defaultAssignedProperties = selectedProperty 
      ? [parseInt(selectedProperty, 10)] 
      : [];
    
    setUserFormData({
      username: '',
      email: '',
      phone: '',
      role: 'user',
      group: '',
      is_active: true,
      password: '',
      assigned_properties: defaultAssignedProperties
    });
    setEditingUser(null);
  };

  // Special handling for adding properties in the form
  const handleRoleChange = (newRole) => {
    // Update the role in the form
    setUserFormData({ 
      ...userFormData, 
      role: newRole 
    });
  };

  const handleEditUser = (user) => {
    // When editing, only allow changing role and department (group)
    setUserFormData({
      user_id: user.user_id,
      username: user.username, // Can't be changed
      email: user.email, // Can't be changed
      phone: user.phone || '',
      role: user.role, // Can be changed
      group: user.group || '', // Can be changed
      is_active: true,
      password: '', // No password change in edit mode
      // Keep the original assigned properties, don't allow modification
      assigned_properties: user.assigned_properties?.map(p => p.property_id) || (selectedProperty ? [selectedProperty] : [])
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
      let payload;
      
      if (editingUser) {
        // When editing, only send role and group for update
        payload = {
          role: userFormData.role,
          group: userFormData.group,
          // Don't change these fields when editing
          username: editingUser.username,
          email: editingUser.email,
          phone: editingUser.phone || '',
          is_active: true
        };
      } else {
        // For new users, send all fields
        payload = {
          username: userFormData.username,
          email: userFormData.email,
          phone: userFormData.phone,
          role: userFormData.role,
          group: userFormData.group,
          is_active: userFormData.is_active,
          password: userFormData.password,
          assigned_properties: userFormData.assigned_properties
        };
      }
      
      console.log('Sending user data:', payload);
      
      let response;
      if (editingUser) {
        response = await apiClient.put(`/users/${userFormData.user_id}`, payload);
        console.log('User update response:', response.data);
        setSuccess('User updated successfully');
      } else {
        response = await apiClient.post('/users', payload);
        console.log('User creation response:', response.data);
        setSuccess('User added to team successfully');
      }
      
      // If the selected property exists, also refresh the property team
      if (selectedProperty) {
        fetchPropertyTeam(selectedProperty);
      }
      
      setOpenUserDialog(false);
      resetUserForm();
    } catch (error) {
      console.error('Failed to save user:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      }
      setError(error.response?.data?.message || error.response?.data?.msg || 'Failed to save user');
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
    // Add null check and normalize group names for case-insensitive comparison
    return propertyTeam.filter(user => 
      user.group && user.group.toLowerCase() === group.toLowerCase()
    );
  };

  const getManagersForProperty = () => {
    // Add null check and handle various manager role names
    return propertyTeam.filter(user => 
      user.role && (
        user.role.toLowerCase() === 'manager' || 
        user.role.toLowerCase() === 'general_manager' || 
        user.role.toLowerCase().includes('manager')
      )
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
            onClick={() => selectedProperty && fetchPropertyTeam(selectedProperty)}
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

      <Box sx={{ mb: 3 }}>
        <PropertySwitcher 
          onPropertyChange={handlePropertyChange} 
          initialValue={selectedProperty} 
        />
      </Box>

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
                          <IconButton 
                            onClick={() => handleEditUser(user)} 
                            size="small" 
                            color="primary"
                            title="Edit role and department"
                          >
                            <EditIcon />
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
                                <TableCell>Role</TableCell>
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filterTeamByGroup(department).map((user) => (
                                <TableRow key={user.user_id}>
                                  <TableCell>{user.username}</TableCell>
                                  <TableCell>{user.email}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={user.role} 
                                      size="small"
                                      color={user.role === 'manager' || user.role === 'general_manager' ? 'primary' : 'default'}  
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <IconButton 
                                      onClick={() => handleEditUser(user)} 
                                      size="small" 
                                      color="primary"
                                      title="Edit role and department"
                                    >
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
              disabled={!!editingUser}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              disabled={!!editingUser}
              required
            />
            <TextField
              fullWidth
              label="Phone"
              value={userFormData.phone}
              onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
              disabled={!!editingUser}
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
                onChange={(e) => {
                  handleRoleChange(e.target.value);
                }}
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
            {!editingUser && (
              <>
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
                    onChange={(e) => {
                      // Ensure the current property is always selected for new users
                      let newValues = e.target.value;
                      if (selectedProperty && !newValues.includes(parseInt(selectedProperty, 10))) {
                        // If the current property was removed, add it back
                        newValues = [...newValues, parseInt(selectedProperty, 10)];
                      }
                      setUserFormData({ ...userFormData, assigned_properties: newValues });
                    }}
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
                              color={propertyId === parseInt(selectedProperty, 10) ? 'primary' : 'default'}
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {properties.map((property) => (
                      <MenuItem 
                        key={property.property_id} 
                        value={property.property_id}
                        disabled={property.property_id === parseInt(selectedProperty, 10)}
                      >
                        {property.name}
                        {property.property_id === parseInt(selectedProperty, 10) && 
                          " (Current - Always Assigned)"}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Note: The current property will always be assigned to new team members.
                    {userFormData.role === 'manager' || userFormData.role === 'general_manager' 
                      ? " Managers can be assigned to multiple properties." 
                      : " Regular users can work across multiple properties."}
                  </Typography>
                </FormControl>
              </>
            )}
            {editingUser && userFormData.assigned_properties.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Assigned Properties (Read Only)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {userFormData.assigned_properties.map((propertyId) => {
                    const property = properties.find(p => p.property_id === propertyId);
                    return (
                      <Chip
                        key={propertyId}
                        label={property ? property.name : `Property ${propertyId}`}
                        size="small"
                        variant="outlined"
                      />
                    );
                  })}
                </Box>
              </Box>
            )}
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