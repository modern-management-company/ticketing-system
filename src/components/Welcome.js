import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Stack,
  Link
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            maxWidth: 600,
            width: '100%'
          }}
        >
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: 'primary.main',
              mb: 4
            }}
          >
            Welcome to Ticketing System
          </Typography>

          <Typography 
            variant="h5" 
            component="h2" 
            gutterBottom
            sx={{ mb: 4, color: 'text.secondary' }}
          >
            Your comprehensive solution for property management and maintenance
          </Typography>

          <Stack 
            spacing={2} 
            direction="column" 
            alignItems="center"
            sx={{ mt: 4 }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/login')}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.2rem'
              }}
            >
              Sign In
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<LocalOfferIcon />}
              onClick={() => navigate('/pricing')}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.2rem'
              }}
            >
              View Pricing
            </Button>

            <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
              Manage tickets, tasks, and service requests efficiently
            </Typography>
          </Stack>
        </Paper>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Ticketing System. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Welcome; 