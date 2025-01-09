import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Grid,
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
  const [status, setStatus] = useState("");
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

    fetchTasks();
  }, [token]);

  const updateTaskStatus = async (taskId) => {
    try {
      const response = await axios.patch(
        `/tasks/${taskId}`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage(response.data.message);
      const updatedTasks = tasks.map((task) =>
        task.task_id === taskId ? { ...task, status } : task
      );
      setTasks(updatedTasks);
    } catch (error) {
      console.error("Failed to update task status", error);
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
                <TableCell align="center">{task.assigned_to}</TableCell>
                <TableCell align="center">
                  <Select
                    value={task.status || status}
                    onChange={(e) => setStatus(e.target.value)}
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
                    onClick={() => updateTaskStatus(task.task_id)}
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
