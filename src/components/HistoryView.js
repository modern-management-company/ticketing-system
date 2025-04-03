import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { format } from 'date-fns';
import apiClient from './apiClient';

const HistoryView = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalEntries, setTotalEntries] = useState(0);
  const [filters, setFilters] = useState({
    entity_type: '',
    action: '',
    start_date: null,
    end_date: null,
    user_id: ''
  });
  const [openStartDatePicker, setOpenStartDatePicker] = useState(false);
  const [openEndDatePicker, setOpenEndDatePicker] = useState(false);

  const entityTypes = ['ticket', 'task', 'user', 'service_request'];
  const actions = ['created', 'updated', 'deleted', 'assigned', 'status_changed'];

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page + 1,
        per_page: rowsPerPage,
        ...filters,
        start_date: filters.start_date ? filters.start_date.toISOString() : '',
        end_date: filters.end_date ? filters.end_date.toISOString() : ''
      });

      const response = await apiClient.get(`/history?${params}`);
      console.log('History API response:', response.data);
      
      // Ensure we have a valid history array, even if the API returns undefined
      setHistory(response.data?.history || []);
      setTotalEntries(response.data?.total || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(err.response?.data?.msg || 'Error fetching history');
      setHistory([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleDateChange = (field) => (date) => {
    setFilters(prev => ({
      ...prev,
      [field]: date
    }));
    if (field === 'start_date') {
      setOpenStartDatePicker(false);
    } else if (field === 'end_date') {
      setOpenEndDatePicker(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(0);
    fetchHistory();
  };

  const handleResetFilters = () => {
    setFilters({
      entity_type: '',
      action: '',
      start_date: null,
      end_date: null,
      user_id: ''
    });
    setPage(0);
    fetchHistory();
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'created':
        return 'success';
      case 'updated':
        return 'info';
      case 'deleted':
        return 'error';
      case 'assigned':
        return 'primary';
      case 'status_changed':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatHistoryEntry = (entry) => {
    if (!entry) return 'Unknown action';
    
    switch (entry.action) {
      case 'created':
        return `${entry.entity_type} created by ${entry.username}`;
      case 'updated':
        return `${entry.username} updated ${entry.field_name} from "${entry.old_value}" to "${entry.new_value}"`;
      case 'deleted':
        return `${entry.entity_type} deleted by ${entry.username}`;
      case 'assigned':
        return `${entry.username} assigned to ${entry.new_value}`;
      case 'status_changed':
        return `${entry.username} changed status from "${entry.old_value}" to "${entry.new_value}"`;
      default:
        return `${entry.username} performed ${entry.action}`;
    }
  };

  if (loading && !history.length) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        System History
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Entity Type"
              value={filters.entity_type}
              onChange={handleFilterChange('entity_type')}
            >
              <MenuItem value="">All</MenuItem>
              {entityTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Action"
              value={filters.action}
              onChange={handleFilterChange('action')}
            >
              <MenuItem value="">All</MenuItem>
              {actions.map(action => (
                <MenuItem key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TextField
                fullWidth
                label="Start Date"
                value={filters.start_date ? format(filters.start_date, 'MM/dd/yyyy') : ''}
                onClick={() => setOpenStartDatePicker(true)}
                inputProps={{ readOnly: true }}
              />
              <Dialog open={openStartDatePicker} onClose={() => setOpenStartDatePicker(false)}>
                <DialogContent>
                  <StaticDatePicker
                    displayStaticWrapperAs="desktop"
                    value={filters.start_date}
                    onChange={handleDateChange('start_date')}
                    renderInput={(params) => <TextField {...params} />}
                  />
                </DialogContent>
              </Dialog>
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TextField
                fullWidth
                label="End Date"
                value={filters.end_date ? format(filters.end_date, 'MM/dd/yyyy') : ''}
                onClick={() => setOpenEndDatePicker(true)}
                inputProps={{ readOnly: true }}
              />
              <Dialog open={openEndDatePicker} onClose={() => setOpenEndDatePicker(false)}>
                <DialogContent>
                  <StaticDatePicker
                    displayStaticWrapperAs="desktop"
                    value={filters.end_date}
                    onChange={handleDateChange('end_date')}
                    renderInput={(params) => <TextField {...params} />}
                  />
                </DialogContent>
              </Dialog>
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" gap={1}>
              <Button variant="contained" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
              <Button variant="outlined" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Entity Type</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history && history.length > 0 ? (
              history.map((entry) => (
                <TableRow key={entry.history_id}>
                  <TableCell>
                    {format(new Date(entry.created_at), 'PPpp')}
                  </TableCell>
                  <TableCell>
                    {entry.entity_type.charAt(0).toUpperCase() + entry.entity_type.slice(1)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={entry.action}
                      color={getActionColor(entry.action)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatHistoryEntry(entry)}</TableCell>
                  <TableCell>{entry.username}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No history entries found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalEntries}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>
    </Box>
  );
};

export default HistoryView; 