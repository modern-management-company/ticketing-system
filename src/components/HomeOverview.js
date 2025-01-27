import React from "react";
import { Typography, Container, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";

const HomeOverview = () => {
  const { auth } = useAuth();

  const getRoleSpecificContent = () => {
    switch (auth?.role) {
      case 'super_admin':
        return (
          <Typography variant="body1" paragraph>
            As a Super Admin, you can manage all properties, users, and system settings.
          </Typography>
        );
      case 'manager':
        return (
          <Typography variant="body1" paragraph>
            Welcome, Property Manager. Manage your assigned properties and handle tickets.
          </Typography>
        );
      default:
        return (
          <Typography variant="body1" paragraph>
            Welcome to the Property Management System.
          </Typography>
        );
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ marginTop: 8, textAlign: "center" }}>
        <Typography variant="h3" gutterBottom>
          Welcome to the Property Management System
        </Typography>
        {getRoleSpecificContent()}
        <Typography variant="body1">
          Use the navigation bar to access your available features.
        </Typography>
      </Box>
    </Container>
  );
};

export default HomeOverview;
