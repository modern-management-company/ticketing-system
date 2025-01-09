import React, { useEffect, useState } from "react";
import axios from "axios";
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
} from "@mui/material";

const ViewTasks = ({ token }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get("/tasks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTasks(response.data.tasks);
      } catch (error) {
        console.error("Failed to fetch tasks", error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await axios.get("/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data.users);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };

    fetchTasks();
    fetchUsers();
  }, [token]);

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await axios.patch(
        `/tasks/${taskId}`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage(response.data.message);

      // Update the local state for the task
      setTasks((prev) =>
        prev.map((task) =>
          task.task_id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error("Failed to update task status", error);
    }
  };

  const updateTaskAssignee = async (taskId, newUserId) => {
    try {
      const response = await axios.patch(
        `/tasks/${taskId}`,
        { assigned_to_user_id: newUserId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage(response.data.message);

      // Update the local state for the task
      setTasks((prev) =>
        prev.map((task) =>
          task.task_id === taskId
            ? { ...task, assigned_to: users.find((u) => u.user_id === newUserId)?.username }
            : task
        )
      );
    } catch (error) {
      console.error("Failed to update task assignee", error);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        View Tasks
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Task ID</TableCell>
              <TableCell align="center">Ticket ID</TableCell>
              <TableCell align="center">Assigned User</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.task_id}>
                <TableCell align="center">{task.task_id}</TableCell>
                <TableCell align="center">{task.ticket_id}</TableCell>
                <TableCell align="center">
                  <Select
                    value={users.find((user) => user.username === task.assigned_to)?.user_id || ""}
                    onChange={(e) =>
                      updateTaskAssignee(task.task_id, e.target.value)
                    }
                    displayEmpty
                  >
                    <MenuItem value="">Select User</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.user_id} value={user.user_id}>
                        {user.username}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell align="center">
                  <Select
                    value={task.status}
                    onChange={(e) =>
                      updateTaskStatus(task.task_id, e.target.value)
                    }
                    displayEmpty
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                  </Select>
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() =>
                      updateTaskStatus(task.task_id, task.status)
                    }
                  >
                    Update
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

export default ViewTasks;
