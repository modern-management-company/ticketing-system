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
  Alert,
} from "@mui/material";

const ReportView = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [usersRes, propertiesRes, tasksRes, ticketsRes] = await Promise.all([
          apiClient.get("/reports/users", { headers: { Authorization: `Bearer ${token}` } }),
          apiClient.get("/reports/properties", { headers: { Authorization: `Bearer ${token}` } }),
          apiClient.get("/reports/tasks", { headers: { Authorization: `Bearer ${token}` } }),
          apiClient.get("/reports/tickets", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setUsers(usersRes.data.users);
        setProperties(propertiesRes.data.properties);
        setTasks(tasksRes.data.tasks);
        setTickets(ticketsRes.data.tickets);
      } catch (err) {
        setError("Failed to fetch reports.");
        console.error(err);
      }
    };

    fetchReports();
  }, [token]);

  const renderTable = (columns, rows) => (
    <TableContainer component={Paper} sx={{ marginTop: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col}>{col}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {columns.map((col) => (
                <TableCell key={col}>{row[col.toLowerCase().replace(" ", "_")]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Typography variant="h5" gutterBottom>
        User Report
      </Typography>
      {renderTable(["User ID", "Username"], users)}

      <Typography variant="h5" gutterBottom>
        Property Report
      </Typography>
      {renderTable(["Property ID", "Name", "Address"], properties)}

      <Typography variant="h5" gutterBottom>
        Task Report
      </Typography>
      {renderTable(["Task ID", "Ticket ID", "Assigned To", "Status"], tasks)}

      <Typography variant="h5" gutterBottom>
        Ticket Report
      </Typography>
      {renderTable(["Ticket ID", "Title", "Status", "Priority"], tickets)}
    </Box>
  );
};

export default ReportView;
