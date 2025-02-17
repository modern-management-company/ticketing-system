import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from './apiClient';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogContent
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PropertySwitcher from './PropertySwitcher';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const Reports = () => {
  const { auth } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({
    tickets: [],
    tasks: []
  });
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await apiClient.get('/properties');
      if (response.data) {
        // Filter only active properties
        const activeProperties = response.data.filter(prop => prop.status === 'active');
        setProperties(activeProperties);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setError('Failed to load properties');
    }
  };

  useEffect(() => {
    if (selectedProperty && selectedDate) {
      fetchReportData();
    }
  }, [selectedProperty, selectedDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const [ticketsRes, tasksRes] = await Promise.all([
        apiClient.get(`/properties/${selectedProperty}/tickets?date=${formattedDate}`),
        apiClient.get(`/properties/${selectedProperty}/tasks?date=${formattedDate}`)
      ]);

      setReportData({
        tickets: ticketsRes.data?.tickets || [],
        tasks: tasksRes.data?.tasks || []
      });
    } catch (error) {
      setError('Failed to fetch report data');
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const generatePDF = (type) => {
    const doc = new jsPDF();
    const property = properties.find(p => p.property_id === selectedProperty);
    const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${property?.name}`;
    const date = format(selectedDate, 'MMMM dd, yyyy');

    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(12);
    doc.text(`Date: ${date}`, 14, 25);

    // Add table
    const data = reportData[type].map(item => {
      if (type === 'tickets') {
        return [
          item.ticket_id,
          item.title,
          item.status,
          item.priority,
          item.created_by_username,
          format(new Date(item.created_at), 'MM/dd/yyyy HH:mm')
        ];
      } else {
        return [
          item.task_id,
          item.title,
          item.status,
          item.priority,
          item.assigned_to || 'Unassigned',
          item.due_date ? format(new Date(item.due_date), 'MM/dd/yyyy') : 'No due date'
        ];
      }
    });

    const columns = type === 'tickets' 
      ? ['ID', 'Title', 'Status', 'Priority', 'Created By', 'Created At']
      : ['ID', 'Title', 'Status', 'Priority', 'Assigned To', 'Due Date'];

    doc.autoTable({
      head: [columns],
      body: data,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    // Save PDF
    doc.save(`${type}_report_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <PropertySwitcher onPropertyChange={setSelectedProperty} />
        </Grid>
        <Grid item xs={12} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <TextField
              fullWidth
              value={format(selectedDate, 'MM/dd/yyyy')}
              onClick={() => setOpenDatePicker(true)}
              label="Select Date"
              inputProps={{ readOnly: true }}
            />
            <Dialog open={openDatePicker} onClose={() => setOpenDatePicker(false)}>
              <DialogContent>
                <StaticDatePicker
                  displayStaticWrapperAs="desktop"
                  value={selectedDate}
                  onChange={(newValue) => {
                    setSelectedDate(newValue);
                    setOpenDatePicker(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </LocalizationProvider>
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Tickets Report" />
          <Tab label="Tasks Report" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => generatePDF('tickets')}
                  disabled={!reportData.tickets.length}
                >
                  Generate PDF
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Created By</TableCell>
                      <TableCell>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.tickets.map((ticket) => (
                      <TableRow key={ticket.ticket_id}>
                        <TableCell>{ticket.ticket_id}</TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>{ticket.status}</TableCell>
                        <TableCell>{ticket.priority}</TableCell>
                        <TableCell>{ticket.created_by_username}</TableCell>
                        <TableCell>
                          {format(new Date(ticket.created_at), 'MM/dd/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => generatePDF('tasks')}
                  disabled={!reportData.tasks.length}
                >
                  Generate PDF
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Due Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.tasks.map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell>{task.task_id}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.status}</TableCell>
                        <TableCell>{task.priority}</TableCell>
                        <TableCell>{task.assigned_to || 'Unassigned'}</TableCell>
                        <TableCell>
                          {task.due_date ? format(new Date(task.due_date), 'MM/dd/yyyy') : 'No due date'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Reports; 