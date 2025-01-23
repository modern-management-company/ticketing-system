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
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const ManageUsers = () => {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersResponse, propertiesResponse] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/properties')
      ]);
      setUsers(usersResponse.data.users);
      setProperties(propertiesResponse.data.properties);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch data');
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
      setMessage('User role updated successfully');
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
      setMessage('Property assignments updated successfully');
    } catch (error) {
      setError('Failed to update property assignments');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Users Management
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Assigned Properties</TableCell>
              {auth.role === 'super_admin' && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>{user.username}</TableCell>
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
                      onClick={() => handlePropertyAssignment(user.user_id, null)}
                    >
                      Remove from Property
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ManageUsers;
