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
  InputLabel
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const ManageUsers = () => {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    assigned_properties: []
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

  const handlePropertyAssignment = async (userId, propertyIds) => {
    try {
      await apiClient.post('/assign-property', { 
        user_id: userId, 
        property_ids: propertyIds 
      });
      
      // Refresh user data
      const response = await apiClient.get('/users');
      setUsers(response.data.users);
      setSuccess('Property assignments updated successfully');
    } catch (error) {
      setError('Failed to update property assignments');
    }
  };

  const handleAddUser = async () => {
    try {
      setError(null);
      setSuccess(null);
      const response = await apiClient.post('/users', userFormData);
      if (response.data && response.data.user) {
        setSuccess('User added successfully');
        await fetchData();
        setOpenUserDialog(false);
        resetUserForm();
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      setError('Failed to add user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await apiClient.delete(`/users/${userId}`);
      setSuccess('User deleted successfully');
      await fetchData();
    } catch (error) {
      setError('Failed to delete user');
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      username: '',
      email: '',
      role: 'user',
      assigned_properties: []
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
        onClick={() => setOpenUserDialog(true)}
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
              {auth.role === 'super_admin' && <TableCell>Actions</TableCell>}
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
                    >
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="manager">Manager</MenuItem>
                      <MenuItem value="super_admin">Super Admin</MenuItem>
                    </Select>
                  ) : (
                    user.role
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    multiple
                    value={user.assigned_properties.map(p => p.property_id)}
                    onChange={(e) => handlePropertyAssignment(user.user_id, e.target.value)}
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
                </TableCell>
                {auth.role === 'super_admin' && (
                  <TableCell>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => handleDeleteUser(user.user_id)}
                    >
                      Remove User
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)}>
        <DialogTitle>Add New User</DialogTitle>
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
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="super_admin">Super Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Assign Properties</InputLabel>
              <Select
                multiple
                value={userFormData.assigned_properties}
                onChange={(e) => setUserFormData({ ...userFormData, assigned_properties: e.target.value })}
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained" color="primary">
            Add User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageUsers;
