import React from "react";
import { Typography, Container, Box } from "@mui/material";

const HomeOverview = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ marginTop: 8, textAlign: "center" }}>
        <Typography variant="h3" gutterBottom>
          Welcome to the Ticketing System
        </Typography>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Your one-stop solution for managing properties, tickets, tasks, and users efficiently.
        </Typography>
        <Typography variant="body1">
          Use the navigation bar to access all the features.
        </Typography>
      </Box>
    </Container>
  );
};

export default HomeOverview;
