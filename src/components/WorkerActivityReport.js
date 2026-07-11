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
  DialogContent,
  Card,
  CardContent,
  Chip,
  IconButton,
  TablePagination
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import PropertySwitcher from './PropertySwitcher';
import { toast } from 'react-hot-toast';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`worker-tabpanel-${index}`}
      aria-labelledby={`worker-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const WorkerActivityReport = () => {
  const { auth } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [openDateRangePicker, setOpenDateRangePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerDetails, setWorkerDetails] = useState(null);
  const [openWorkerDialog, setOpenWorkerDialog] = useState(false);

  useEffect(() => {
    if (selectedProperty) {
      fetchWorkerActivity();
      fetchSummary();
    }
  }, [selectedProperty, dateRange]);

  const fetchWorkerActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      const formattedStartDate = format(dateRange.start, 'yyyy-MM-dd');
      const formattedEndDate = format(dateRange.end, 'yyyy-MM-dd');

      const response = await apiClient.get('/api/reports/property-worker-activity', {
        params: {
          property_id: selectedProperty,
          date_from: formattedStartDate,
          date_to: formattedEndDate,
          include_completed: true
        }
      });

      if (response.data.success && response.data.properties.length > 0) {
        setReportData(response.data.properties[0].workers || []);
      } else {
        setReportData([]);
      }
    } catch (error) {
      setError('Failed to fetch worker activity data');
      console.error('Error fetching worker activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const formattedStartDate = format(dateRange.start, 'yyyy-MM-dd');
      const formattedEndDate = format(dateRange.end, 'yyyy-MM-dd');

      const response = await apiClient.get('/api/reports/property-summary', {
        params: {
          date_from: formattedStartDate,
          date_to: formattedEndDate
        }
      });

      if (response.data.success) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchWorkerDetails = async (workerId) => {
    try {
      setLoading(true);
      const formattedStartDate = format(dateRange.start, 'yyyy-MM-dd');
      const formattedEndDate = format(dateRange.end, 'yyyy-MM-dd');

      const response = await apiClient.get(`/api/reports/worker-detailed-activity/${workerId}`, {
        params: {
          property_id: selectedProperty,
          date_from: formattedStartDate,
          date_to: formattedEndDate
        }
      });

      if (response.data.success) {
        setWorkerDetails(response.data);
        setOpenWorkerDialog(true);
      }
    } catch (error) {
      toast.error('Failed to fetch worker details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'completed') return '#4caf50';
    if (statusLower.includes('progress')) return '#2196f3';
    if (statusLower === 'pending') return '#ff9800';
    return '#9e9e9e';
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ffc107';
    if (score >= 40) return '#ff9800';
    return '#f44336';
  };

  const exportToExcel = () => {
    try {
      const wsData = [];
      wsData.push(['Worker Activity Report']);
      wsData.push([`Date Range: ${format(dateRange.start, 'MM/dd/yyyy')} - ${format(dateRange.end, 'MM/dd/yyyy')}`]);
      wsData.push([]);
      wsData.push(['Worker Name', 'Email', 'Phone', 'Group', 'Tasks Assigned', 'Completed', 'In Progress', 'Pending', 'Total Hours', 'Avg Hours/Task', 'Completion %', 'Performance Score']);

      reportData.forEach(worker => {
        wsData.push([
          worker.worker_name,
          worker.email,
          worker.phone,
          worker.group,
          worker.tasks_assigned,
          worker.tasks_completed,
          worker.tasks_in_progress,
          worker.tasks_pending,
          worker.total_hours_logged,
          worker.avg_hours_per_task,
          worker.completion_rate,
          worker.performance_score
        ]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 16 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Worker Activity');
      XLSX.writeFile(wb, `worker_activity_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    }
  };

  // Prepare chart data
  const performanceChartData = reportData
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 10)
    .map(worker => ({
      name: worker.worker_name.split(' ')[0],
      score: worker.performance_score
    }));

  const completionChartData = reportData.map(worker => ({
    name: worker.worker_name.split(' ')[0],
    completed: worker.tasks_completed,
    pending: worker.tasks_pending,
    inProgress: worker.tasks_in_progress
  }));

  const hoursChartData = reportData
    .sort((a, b) => b.total_hours_logged - a.total_hours_logged)
    .slice(0, 8)
    .map(worker => ({
      name: worker.worker_name.split(' ')[0],
      hours: worker.total_hours_logged
    }));

  const statusDistribution = [
    {
      name: 'Completed',
      value: reportData.reduce((sum, w) => sum + w.tasks_completed, 0),
      fill: '#4caf50'
    },
    {
      name: 'In Progress',
      value: reportData.reduce((sum, w) => sum + w.tasks_in_progress, 0),
      fill: '#2196f3'
    },
    {
      name: 'Pending',
      value: reportData.reduce((sum, w) => sum + w.tasks_pending, 0),
      fill: '#ff9800'
    }
  ];

  const displayedData = reportData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Worker Activity by Property
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <PropertySwitcher onPropertyChange={setSelectedProperty} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Date Range
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                fullWidth
                value={`${format(dateRange.start, 'MM/dd/yyyy')} - ${format(dateRange.end, 'MM/dd/yyyy')}`}
                onClick={() => setOpenDateRangePicker(true)}
                label="Select Date Range"
                inputProps={{ readOnly: true }}
              />
              <Dialog open={openDateRangePicker} onClose={() => setOpenDateRangePicker(false)}>
                <DialogContent>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <StaticDatePicker
                      displayStaticWrapperAs="desktop"
                      value={dateRange.start}
                      onChange={(newValue) => {
                        setDateRange(prev => ({ ...prev, start: newValue }));
                      }}
                      renderInput={(params) => <TextField {...params} />}
                    />
                    <StaticDatePicker
                      displayStaticWrapperAs="desktop"
                      value={dateRange.end}
                      onChange={(newValue) => {
                        setDateRange(prev => ({ ...prev, end: newValue }));
                      }}
                      renderInput={(params) => <TextField {...params} />}
                    />
                  </LocalizationProvider>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={() => setOpenDateRangePicker(false)}>Cancel</Button>
                    <Button
                      variant="contained"
                      onClick={() => setOpenDateRangePicker(false)}
                    >
                      Apply
                    </Button>
                  </Box>
                </DialogContent>
              </Dialog>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => {
                fetchWorkerActivity();
                fetchSummary();
              }}
              disabled={!selectedProperty || loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={exportToExcel}
              disabled={reportData.length === 0}
            >
              Export
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Workers
                </Typography>
                <Typography variant="h5">
                  {summary.total_workers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Tasks
                </Typography>
                <Typography variant="h5">
                  {summary.total_tasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completion Rate
                </Typography>
                <Typography variant="h5" sx={{ color: '#4caf50' }}>
                  {summary.completion_rate}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Hours
                </Typography>
                <Typography variant="h5">
                  {summary.total_hours_logged}h
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Worker List" />
          <Tab label="Performance Score" />
          <Tab label="Task Distribution" />
          <Tab label="Hours Logged" />
          <Tab label="Status Overview" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Tab 0: Worker List */}
            <TabPanel value={tabValue} index={0}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Worker Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Assigned</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Completed</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>In Progress</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Pending</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Hours</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Completion %</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Performance</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedData.length > 0 ? (
                      displayedData.map((worker) => (
                        <TableRow key={worker.worker_id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {worker.worker_name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {worker.group}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{worker.tasks_assigned}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={worker.tasks_completed}
                              sx={{ backgroundColor: '#4caf50', color: 'white' }}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={worker.tasks_in_progress}
                              sx={{ backgroundColor: '#2196f3', color: 'white' }}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={worker.tasks_pending}
                              sx={{ backgroundColor: '#ff9800', color: 'white' }}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{worker.total_hours_logged}h</TableCell>
                          <TableCell align="right">
                            <Typography
                              sx={{
                                fontWeight: 600,
                                color: worker.completion_rate >= 75 ? '#4caf50' : worker.completion_rate >= 50 ? '#ffc107' : '#f44336'
                              }}
                            >
                              {worker.completion_rate.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{
                                width: 60,
                                height: 30,
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: getPerformanceColor(worker.performance_score),
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            >
                              {worker.performance_score.toFixed(0)}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => {
                                setSelectedWorker(worker);
                                fetchWorkerDetails(worker.worker_id);
                              }}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          <Typography color="textSecondary">
                            No worker data available for the selected criteria
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {reportData.length > 0 && (
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={reportData.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              )}
            </TabPanel>

            {/* Tab 1: Performance Score Chart */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Top 10 Performers by Score
              </Typography>
              {performanceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="textSecondary">No data available</Typography>
              )}
            </TabPanel>

            {/* Tab 2: Task Distribution Chart */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Task Distribution by Worker
              </Typography>
              {completionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={completionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" stackId="a" fill="#4caf50" name="Completed" />
                    <Bar dataKey="inProgress" stackId="a" fill="#2196f3" name="In Progress" />
                    <Bar dataKey="pending" stackId="a" fill="#ff9800" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="textSecondary">No data available</Typography>
              )}
            </TabPanel>

            {/* Tab 3: Hours Logged Chart */}
            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Total Hours Logged by Worker
              </Typography>
              {hoursChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={hoursChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="textSecondary">No data available</Typography>
              )}
            </TabPanel>

            {/* Tab 4: Status Overview */}
            <TabPanel value={tabValue} index={4}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Overall Task Status Distribution
              </Typography>
              {statusDistribution.some(s => s.value > 0) ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="textSecondary">No data available</Typography>
              )}
            </TabPanel>
          </>
        )}
      </Paper>

      {/* Worker Details Dialog */}
      <Dialog
        open={openWorkerDialog}
        onClose={() => setOpenWorkerDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ pt: 3 }}>
          {workerDetails ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6">
                    {workerDetails.worker_name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {workerDetails.email}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ color: '#2196f3' }}>
                  {workerDetails.total_tasks} Tasks
                </Typography>
              </Box>

              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Task ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {workerDetails.tasks.map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell>#{task.task_id}</TableCell>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>
                          <Chip
                            label={task.status}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(task.status),
                              color: 'white'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">{task.time_spent || 0}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default WorkerActivityReport;
