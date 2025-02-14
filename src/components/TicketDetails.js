import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../components/apiClient';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Grid,
  Chip,
} from '@mui/material';

const TicketDetails = () => {
  const { ticketId } = useParams();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');

  const fetchTicketDetails = useCallback(async () => {
    if (!auth?.token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get(`/tickets/${ticketId}`);
      setTicket(response.data);
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
      setError(error.response?.data?.message || 'Failed to fetch ticket details');
    } finally {
      setLoading(false);
    }
  }, [auth?.token, ticketId]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!auth?.token) {
      setError('Authentication required');
      return;
    }

    try {
      await apiClient.post(`/tickets/${ticketId}/comments`, { content: comment });
      setComment('');
      fetchTicketDetails();
    } catch (error) {
      console.error('Failed to add comment:', error);
      setError(error.response?.data?.message || 'Failed to add comment');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Add ticket details content */}
    </Box>
  );
};

export default TicketDetails; 