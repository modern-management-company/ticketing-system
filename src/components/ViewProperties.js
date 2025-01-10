import React, { useEffect, useState } from "react";
import apiClient from "./apiClient"; 
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
} from "@mui/material";

const ViewProperties = ({ token }) => {
  const [properties, setProperties] = useState([]);
  const [editProperty, setEditProperty] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await apiClient.get("/properties", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProperties(response.data.properties);
      } catch (error) {
        console.error("Failed to fetch properties", error);
      }
    };

    fetchProperties();
  }, [token]);

  const handleEdit = async (propertyId) => {
    try {
      const response = await apiClient.patch(
        `/properties/${propertyId}`,
        {
          name: editProperty.name,
          address: editProperty.address,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      setProperties((prev) =>
        prev.map((property) =>
          property.property_id === propertyId
            ? { ...property, ...editProperty }
            : property
        )
      );
      setEditProperty({});
    } catch (error) {
      console.error("Failed to edit property", error);
    }
  };

  const handleDelete = async (propertyId) => {
    try {
      const response = await apiClient.delete(`/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(response.data.message);
      setProperties((prev) =>
        prev.filter((property) => property.property_id !== propertyId)
      );
    } catch (error) {
      console.error("Failed to delete property", error);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        View Properties
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Property ID</TableCell>
              <TableCell align="center">Name</TableCell>
              <TableCell align="center">Address</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.property_id}>
                <TableCell align="center">{property.property_id}</TableCell>
                <TableCell align="center">
                  {editProperty.property_id === property.property_id ? (
                    <TextField
                      defaultValue={property.name}
                      onChange={(e) =>
                        setEditProperty({ ...editProperty, name: e.target.value })
                      }
                    />
                  ) : (
                    property.name
                  )}
                </TableCell>
                <TableCell align="center">
                  {editProperty.property_id === property.property_id ? (
                    <TextField
                      defaultValue={property.address}
                      onChange={(e) =>
                        setEditProperty({
                          ...editProperty,
                          address: e.target.value,
                        })
                      }
                    />
                  ) : (
                    property.address
                  )}
                </TableCell>
                <TableCell align="center">
                  {editProperty.property_id === property.property_id ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleEdit(property.property_id)}
                    >
                      Save
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => setEditProperty(property)}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDelete(property.property_id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {message && <Typography color="success.main">{message}</Typography>}
    </Box>
  );
};

export default ViewProperties;
