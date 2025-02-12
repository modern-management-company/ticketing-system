import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Container, Box, Typography, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const { auth } = useAuth();
  
  return (
    <Container>
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h4" color="error" gutterBottom>
          Unauthorized Access
        </Typography>
        <Typography variant="body1">
          {auth?.user ? 
            `User ${auth.user.username} (${auth.user.role}) does not have permission to access this resource.` :
            'Please log in to access this resource.'}
        </Typography>
        <Button
          component={RouterLink}
          to="/login"
          variant="contained"
          sx={{ mt: 2 }}
        >
          Back to Login
        </Button>
      </Box>
    </Container>
  );
};

export default Unauthorized; 