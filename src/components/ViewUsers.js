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
} from "@mui/material";

const ViewUsers = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get("/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data.users);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };

    fetchUsers();
  }, [token]);

  const handleEdit = async (userId) => {
    try {
      const response = await apiClient.patch(
        `/users/${userId}`,
        { username: editUser.username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === userId
            ? { ...user, username: editUser.username }
            : user
        )
      );
      setEditUser({});
    } catch (error) {
      console.error("Failed to edit user", error);
    }
  };

  const handleDelete = async (userId) => {
    try {
      const response = await apiClient.delete(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(response.data.message);
      setUsers((prev) => prev.filter((user) => user.user_id !== userId));
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        View Users
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">User ID</TableCell>
              <TableCell align="center">Username</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell align="center">{user.user_id}</TableCell>
                <TableCell align="center">
                  {editUser.user_id === user.user_id ? (
                    <TextField
                      defaultValue={user.username}
                      onChange={(e) =>
                        setEditUser({ ...editUser, username: e.target.value })
                      }
                    />
                  ) : (
                    user.username
                  )}
                </TableCell>
                <TableCell align="center">
                  {editUser.user_id === user.user_id ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleEdit(user.user_id)}
                    >
                      Save
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => setEditUser(user)}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDelete(user.user_id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {message && <Typography color="success.main">{message}</Typography>}
    </Box>
  );
};

export default ViewUsers;
