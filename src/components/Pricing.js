import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Basic Plan',
      price: 20,
      features: [
        'Core Ticketing System',
        'Basic Support',
        'Ticket creation & assignment',
        'Property & room management',
        'Task management features',
        'Email notifications',
      ],
      buttonText: 'Get Started',
      buttonVariant: 'contained',
    },
    {
      name: 'Premium Plan',
      price: 30,
      features: [
        'All Basic Plan features',
        'File Attachments',
        'SMS Notifications',
        'Priority Support',
        'Advanced Analytics',
        'Custom Branding',
      ],
      buttonText: 'Get Premium',
      buttonVariant: 'contained',
      highlight: true,
    },
  ];

  const handleSelectPlan = (plan) => {
    // TODO: Implement plan selection logic
    console.log('Selected plan:', plan);
    navigate('/register');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" component="h1" gutterBottom>
          Simple, Transparent Pricing
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Choose the plan that works best for your property management needs
        </Typography>
      </Box>

      <Grid container spacing={4} justifyContent="center">
        {plans.map((plan) => (
          <Grid item xs={12} md={6} key={plan.name}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
                border: plan.highlight ? '2px solid #1976d2' : 'none',
                boxShadow: plan.highlight ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <CardHeader
                title={plan.name}
                titleTypographyProps={{ align: 'center', variant: 'h4' }}
                subheader={
                  <Typography variant="h5" color="primary" align="center">
                    ${plan.price}/month
                  </Typography>
                }
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <List>
                  {plan.features.map((feature, index) => (
                    <React.Fragment key={feature}>
                      <ListItem>
                        <ListItemIcon>
                          <CheckIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                      {index < plan.features.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
              <Box sx={{ p: 2 }}>
                <Button
                  fullWidth
                  variant={plan.buttonVariant}
                  onClick={() => handleSelectPlan(plan)}
                  size="large"
                  color={plan.highlight ? 'primary' : 'inherit'}
                >
                  {plan.buttonText}
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mt={6} textAlign="center">
        <Typography variant="h6" gutterBottom>
          Example Customer Scenarios
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Customer A: Basic Features
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Uses core ticketing functionality with email notifications
                </Typography>
                <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                  Total Cost: $20/month
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Customer B: Premium Features
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Uses full system with attachments and SMS notifications
                </Typography>
                <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                  Total Cost: $30/month
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Pricing; 