import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

const RegisterUser = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/register", { username, password });
      setMessage("User registered successfully!");
      setUsername("");
      setPassword("");
    } catch (error) {
      console.error("Failed to register user", error);
      setMessage("Failed to register user.");
    }
  };

  return (
    <Box sx={{ maxWidth: 600, margin: "auto", padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Register User
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          margin="normal"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Register
        </Button>
      </form>

      {message && (
        <Snackbar
          open={!!message}
          autoHideDuration={6000}
          onClose={() => setMessage("")}
        >
          <Alert
            severity={message.includes("successfully") ? "success" : "error"}
            onClose={() => setMessage("")}
          >
            {message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default RegisterUser;
