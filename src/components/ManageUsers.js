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
  IconButton,
  FormControlLabel,
  Checkbox,
  Tooltip
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';

const ManageUsers = () => {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    group: '',
    phone: '',
    assigned_properties: [],
    is_active: true
  });
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
    sendEmail: true
  });

  const roles = ['user', 'manager', 'super_admin'];
  const groups = ['Front Desk', 'Maintenance', 'Housekeeping', 'Engineering', 'Executive'];

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
      setError('');
      setSuccess('');
      
      const user = users.find(u => u.user_id === userId);
      
      // Get current user properties before role change
      const currentProperties = user.assigned_properties.map(p => p.property_id);
      
      // If changing to manager, we need to ensure PropertyManager entries are created
      const payload = { 
        role: newRole,
        property_ids: currentProperties
      };
      
      // Special flag when upgrading to manager to ensure backend creates proper assignments
      if (user.role !== 'manager' && newRole === 'manager') {
        payload.is_upgrading_to_manager = true;
      }

      const response = await apiClient.patch(`/users/${userId}`, payload);
      
      if (response.data?.user) {
        setUsers(users.map(user =>
          user.user_id === userId ? response.data.user : user
        ));
        setSuccess(`User role updated successfully to ${newRole}`);
        await fetchData(); // Refresh to get updated property manager statuses
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
      setError(error.response?.data?.msg || 'Failed to update user role');
    }
  };

  const handleGroupChange = async (userId, newGroup) => {
    try {
      const response = await apiClient.patch(`/users/${userId}`, { group: newGroup });
      if (response.data?.user) {
        setUsers(users.map(user =>
          user.user_id === userId ? response.data.user : user
        ));
        setSuccess('User group updated successfully');
      }
    } catch (error) {
      setError('Failed to update user group');
    }
  };

  const handlePropertyAssignment = async (userId, propertyIds) => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const response = await apiClient.post('/assign-property', {
        user_id: userId,
        property_ids: propertyIds
      });

      if (response.data) {
        setSuccess(response.data.msg);
        await fetchData(); // Refresh the user list
      }
    } catch (error) {
      console.error('Failed to update property assignments:', error);
      setError(error.response?.data?.msg || 'Failed to update property assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      group: user.group || '',
      phone: user.phone || '',
      assigned_properties: user.assigned_properties.map(p => p.property_id),
      is_active: user.is_active
    });
    setOpenUserDialog(true);
  };

  const handleOpenGroupDialog = (user) => {
    setSelectedUser(user);
    setOpenGroupDialog(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      const user = users.find(u => u.user_id === userId);
      if (user.role === 'super_admin') {
        setError('Cannot delete super admin users');
        return;
      }

      // First check for associated tickets and tasks
      const [ticketsResponse, tasksResponse] = await Promise.all([
        apiClient.get(`/users/${userId}/tickets`),
        apiClient.get(`/users/${userId}/tasks`)
      ]);

      const tickets = ticketsResponse.data?.tickets || [];
      const tasks = tasksResponse.data?.tasks || [];

      let warningMessage = `WARNING: Are you sure you want to delete user "${user.username}"?\n\n`;

      if (tickets.length > 0 || tasks.length > 0) {
        warningMessage += 'This user has:\n';
        if (tickets.length > 0) {
          warningMessage += `• ${tickets.length} ticket(s)\n`;
        }
        if (tasks.length > 0) {
          warningMessage += `• ${tasks.length} task(s)\n`;
        }
        warningMessage += '\nDeleting this user will:\n';
        warningMessage += '• Reassign all tickets to system\n';
        warningMessage += '• Unassign all tasks\n';
        warningMessage += '• Remove all property assignments\n\n';
        warningMessage += 'This action cannot be undone. Do you want to proceed?';
      } else {
        warningMessage += 'This will remove the user and all their property assignments.\nThis action cannot be undone.';
      }

      if (!window.confirm(warningMessage)) {
        return;
      }

      await apiClient.delete(`/users/${userId}`);
      setSuccess('User deleted successfully');
      await fetchData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      setError(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setSuccess(null);

      // Validate required fields
      if (!userFormData.username || !userFormData.email) {
        setError('Username and email are required');
        return;
      }

      // Prepare the payload
      const payload = {
        ...userFormData,
        property_ids: userFormData.assigned_properties,
        is_active: userFormData.is_active
      };

      // If user is changed to manager, ensure we keep property assignments
      if (editingUser && editingUser.role !== 'manager' && userFormData.role === 'manager') {
        // When upgrading to manager, keep the existing property assignments
        console.log('Upgrading user to manager role with properties:', userFormData.assigned_properties);
        
        // Make sure the proper PropertyManager assignments will be created in the backend
        payload.is_upgrading_to_manager = true;
      }

      let response;
      if (editingUser) {
        response = await apiClient.put(`/users/${editingUser.user_id}`, payload);
        if (response.data?.user) {
          setSuccess('User updated successfully');
          setOpenUserDialog(false);
          await fetchData(); // Refresh the user list
          resetUserForm();
        }
      } else {
        if (!userFormData.password) {
          setError('Password is required for new users');
          return;
        }
        response = await apiClient.post('/users', payload);
        if (response.data?.user) {
          setSuccess('User added successfully');
          setOpenUserDialog(false);
          await fetchData();
          resetUserForm();
        }
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      setError(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleActivateUser = async (userId) => {
    try {
      const response = await apiClient.patch(`/users/${userId}`, { is_active: true });
      if (response.data?.user) {
        setSuccess('User activated successfully. Login credentials have been sent via email.');
        await fetchData();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to activate user');
    }
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUserFormData({
      username: '',
      email: '',
      password: '',
      role: 'user',
      group: '',
      phone: '',
      assigned_properties: [],
      is_active: true
    });
  };

  const handleChangePassword = async () => {
    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }

      await apiClient.post(`/users/${selectedUser.user_id}/admin-change-password`, {
        new_password: passwordForm.newPassword,
        send_email: passwordForm.sendEmail
      });

      setSuccess('Password changed successfully');
      setOpenPasswordDialog(false);
      resetPasswordForm();
    } catch (error) {
      console.error('Failed to change password:', error);
      setError(error.response?.data?.message || 'Failed to change password');
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      newPassword: '',
      confirmPassword: '',
      sendEmail: true
    });
    setSelectedUser(null);
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
              <TableCell>Phone</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Group</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned Properties</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || 'Not set'}</TableCell>
                <TableCell>
                  {auth.role === 'super_admin' ? (
                    <Select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                      size="small"
                      disabled={!user.is_active}
                    >
                      {roles.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    user.role.charAt(0).toUpperCase() + user.role.slice(1)
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title="Click to change group">
                    <Chip
                      label={user.group || 'No Group'}
                      onClick={() => handleOpenGroupDialog(user)}
                      icon={<GroupIcon />}
                      color={user.group ? 'primary' : 'default'}
                      variant={user.group ? 'filled' : 'outlined'}
                      disabled={!user.is_active || user.role === 'super_admin'}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Pending'}
                    color={user.is_active ? 'success' : 'warning'}
                    variant={user.is_active ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
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
                              color={user.role === 'manager' ? 'primary' : 'default'}
                              variant={user.role === 'manager' ? 'filled' : 'outlined'}
                            />
                          );
                        })}
                      </Box>
                    )}
                    size="small"
                    disabled={user.role === 'super_admin' || !user.is_active}
                  >
                    {properties.map((property) => (
                      <MenuItem key={property.property_id} value={property.property_id}>
                        {property.name}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {auth.role === 'super_admin' && !user.is_active && (
                      <Tooltip title="Activate User">
                        <IconButton
                          onClick={() => handleActivateUser(user.user_id)}
                          color="success"
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Edit User">
                      <IconButton
                        onClick={() => handleEditUser(user)}
                        color="primary"
                        disabled={user.role === 'super_admin'}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton
                        onClick={() => handleDeleteUser(user.user_id)}
                        color="error"
                        disabled={user.role === 'super_admin'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Change Password">
                      <IconButton
                        onClick={() => {
                          setSelectedUser(user);
                          setOpenPasswordDialog(true);
                        }}
                        color="secondary"
                        disabled={user.role === 'super_admin' || !user.is_active}
                      >
                        <LockResetIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* User Dialog */}
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
            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              value={userFormData.phone}
              onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
              margin="normal"
              placeholder="+1234567890"
            />
            {!editingUser && (
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                margin="normal"
                required
              />
            )}
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                value={userFormData.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setUserFormData({
                    ...userFormData,
                    role: newRole,
                    assigned_properties: newRole === 'manager' ? [] : userFormData.assigned_properties
                  });
                }}
                label="Role"
              >
                {roles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Group</InputLabel>
              <Select
                value={userFormData.group}
                onChange={(e) => setUserFormData({ ...userFormData, group: e.target.value })}
                label="Group"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group} value={group}>
                    {group}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
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

            {userFormData.role !== 'super_admin' && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Assign Properties</InputLabel>
                <Select
                  multiple
                  value={userFormData.assigned_properties}
                  onChange={(e) => {
                    const newValue = Array.isArray(e.target.value) ? e.target.value : [e.target.value];
                    setUserFormData({
                      ...userFormData,
                      assigned_properties: newValue
                    });
                  }}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={properties.find(p => p.property_id === value)?.name}
                          size="small"
                          color={userFormData.role === 'manager' ? 'primary' : 'default'}
                          variant={userFormData.role === 'manager' ? 'filled' : 'outlined'}
                        />
                      ))}
                    </Box>
                  )}
                  label="Assign Properties"
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

      {/* Group Dialog */}
      <Dialog
        open={openGroupDialog}
        onClose={() => setOpenGroupDialog(false)}
      >
        <DialogTitle>
          Change Group for {selectedUser?.username}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Group</InputLabel>
            <Select
              value={selectedUser?.group || ''}
              onChange={(e) => handleGroupChange(selectedUser?.user_id, e.target.value)}
              label="Group"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {groups.map((group) => (
                <MenuItem key={group} value={group}>
                  {group}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGroupDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Dialog */}
      <Dialog
        open={openPasswordDialog}
        onClose={() => {
          setOpenPasswordDialog(false);
          resetPasswordForm();
        }}
      >
        <DialogTitle>
          Change Password for {selectedUser?.username}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="New Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              fullWidth
              required
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={passwordForm.sendEmail}
                  onChange={(e) => setPasswordForm({ ...passwordForm, sendEmail: e.target.checked })}
                />
              }
              label="Send password via email"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenPasswordDialog(false);
            resetPasswordForm();
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            color="primary"
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageUsers;
