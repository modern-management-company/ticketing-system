import React, { useEffect, useState } from "react";
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
  Button,
  TextField,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  IconButton
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const ManageUsers = () => {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    assigned_properties: [],
    managed_property: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersResponse, propertiesResponse] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/properties')
      ]);

      if (usersResponse.data && Array.isArray(usersResponse.data.users)) {
        setUsers(usersResponse.data.users.map(user => ({
          ...user,
          assigned_properties: user.assigned_properties || []
        })));
      } else {
        setUsers([]);
        console.warn('No users data available or invalid format');
      }

      if (propertiesResponse.data && Array.isArray(propertiesResponse.data)) {
        setProperties(propertiesResponse.data);
      } else {
        setProperties([]);
        console.warn('No properties data available or invalid format');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to fetch users and properties');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (auth.role !== 'super_admin') return;

    try {
      await apiClient.patch(`/users/${userId}`, { role: newRole });
      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role: newRole } : user
      ));
      setSuccess('User role updated successfully');
    } catch (error) {
      setError('Failed to update user role');
    }
  };

  const handlePropertyAssignment = async (userId, propertyIds, isManager = false) => {
    try {
      const user = users.find(u => u.user_id === userId);
      if (!user) return;

      // For managers, only allow one property
      if (user.role === 'manager' && propertyIds.length > 1) {
        setError('Managers can only manage one property');
        return;
      }

      // For managers, update the managed property
      if (isManager) {
        await apiClient.patch(`/users/${userId}`, {
          managed_property_id: propertyIds[0]
        });
      } else {
        // For regular users, update assigned properties
        await apiClient.post('/assign-property', {
          user_id: userId,
          property_ids: propertyIds
        });
      }
      
      await fetchData(); // Refresh data
      setSuccess('Property assignments updated successfully');
    } catch (error) {
      console.error('Failed to update property assignments:', error);
      setError(error.response?.data?.message || 'Failed to update property assignments');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      assigned_properties: user.assigned_properties.map(p => p.property_id),
      managed_property: user.managed_property_id || null
    });
    setOpenUserDialog(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      const user = users.find(u => u.user_id === userId);
      if (user.role === 'super_admin') {
        setError('Cannot delete super admin users');
        return;
      }

      if (!window.confirm('Are you sure you want to delete this user?')) {
        return;
      }

      await apiClient.delete(`/users/${userId}`);
      setSuccess('User deleted successfully');
      await fetchData();
    } catch (error) {
      setError('Failed to delete user');
    }
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setSuccess(null);

      const payload = {
        ...userFormData,
        managed_property_id: userFormData.role === 'manager' ? userFormData.managed_property : null
      };

      if (editingUser) {
        await apiClient.put(`/users/${editingUser.user_id}`, payload);
        setSuccess('User updated successfully');
      } else {
        const response = await apiClient.post('/users', payload);
        if (response.data && response.data.user) {
          setSuccess('User added successfully');
        }
      }

      await fetchData();
      setOpenUserDialog(false);
      resetUserForm();
    } catch (error) {
      console.error('Failed to save user:', error);
      setError(error.response?.data?.message || 'Failed to save user');
    }
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUserFormData({
      username: '',
      email: '',
      role: 'user',
      assigned_properties: [],
      managed_property: null
    });
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Users Management
      </Typography>
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          resetUserForm();
          setOpenUserDialog(true);
        }}
        sx={{ mb: 2 }}
      >
        Add User
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Assigned Properties</TableCell>
              {auth.role === 'super_admin' && <TableCell>Managed Property</TableCell>}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {auth.role === 'super_admin' ? (
                    <Select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                      size="small"
                    >
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="manager">Manager</MenuItem>
                      <MenuItem value="super_admin">Admin</MenuItem>
                    </Select>
                  ) : (
                    user.role === 'super_admin' ? 'Admin' : user.role
                  )}
                </TableCell>
                <TableCell>
                  {user.role !== 'manager' && (
                    <Select
                      multiple
                      value={user.assigned_properties?.map(p => p.property_id) || []}
                      onChange={(e) => handlePropertyAssignment(user.user_id, e.target.value)}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((propertyId) => {
                            const property = user.assigned_properties.find(p => p.property_id === propertyId);
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
                      size="small"
                    >
                      {properties.map((property) => (
                        <MenuItem key={property.property_id} value={property.property_id}>
                          {property.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                </TableCell>
                {auth.role === 'super_admin' && (
                  <TableCell>
                    {user.role === 'manager' && (
                      <Select
                        value={user.managed_property_id || ''}
                        onChange={(e) => handlePropertyAssignment(user.user_id, [e.target.value], true)}
                        size="small"
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {properties.map((property) => (
                          <MenuItem key={property.property_id} value={property.property_id}>
                            {property.name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      onClick={() => handleEditUser(user)}
                      color="primary"
                      disabled={user.role === 'super_admin'}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteUser(user.user_id)}
                      color="error"
                      disabled={user.role === 'super_admin'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)}>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={userFormData.username}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                value={userFormData.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setUserFormData({
                    ...userFormData,
                    role: newRole,
                    // Clear property assignments when switching roles
                    assigned_properties: newRole === 'manager' ? [] : userFormData.assigned_properties,
                    managed_property: newRole === 'manager' ? userFormData.managed_property : null
                  });
                }}
                label="Role"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="super_admin">Admin</MenuItem>
              </Select>
            </FormControl>
            
            {userFormData.role === 'manager' ? (
              <FormControl fullWidth margin="normal">
                <InputLabel>Managed Property</InputLabel>
                <Select
                  value={userFormData.managed_property || ''}
                  onChange={(e) => setUserFormData({
                    ...userFormData,
                    managed_property: e.target.value
                  })}
                  label="Managed Property"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {properties.map((property) => (
                    <MenuItem key={property.property_id} value={property.property_id}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth margin="normal">
                <InputLabel>Assign Properties</InputLabel>
                <Select
                  multiple
                  value={userFormData.assigned_properties}
                  onChange={(e) => setUserFormData({
                    ...userFormData,
                    assigned_properties: e.target.value
                  })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={properties.find(p => p.property_id === value)?.name}
                        />
                      ))}
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
            {editingUser ? 'Update' : 'Add'} User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageUsers;
