import axios from 'axios';

const API_URL = 'https://ticketing-system-6f4u.onrender.com';

// Auth endpoints
export const login = async (credentials) => {
  const response = await axios.post(`${API_URL}/auth/login`, credentials);
  return response.data;
};

export const register = async (userData) => {
  const response = await axios.post(`${API_URL}/auth/register`, userData);
  return response.data;
};

export const requestPasswordReset = async (email) => {
  const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
  return response.data;
};

export const resetPassword = async (data) => {
  const response = await axios.post(`${API_URL}/auth/reset-password`, data);
  return response.data;
};

// User endpoints
export const getUserProfile = async () => {
  const response = await axios.get(`${API_URL}/users/profile`);
  return response.data;
};

export const updateUserProfile = async (data) => {
  const response = await axios.put(`${API_URL}/users/profile`, data);
  return response.data;
};

export const changePassword = async (data) => {
  const response = await axios.post(`${API_URL}/users/change-password`, data);
  return response.data;
};

// Ticket endpoints
export const getTickets = async (params) => {
  const response = await axios.get(`${API_URL}/tickets`, { params });
  return response.data;
};

export const createTicket = async (data) => {
  const response = await axios.post(`${API_URL}/tickets`, data);
  return response.data;
};

export const updateTicket = async (id, data) => {
  const response = await axios.put(`${API_URL}/tickets/${id}`, data);
  return response.data;
};

export const deleteTicket = async (id) => {
  const response = await axios.delete(`${API_URL}/tickets/${id}`);
  return response.data;
};

// Task endpoints
export const getTasks = async (params) => {
  const response = await axios.get(`${API_URL}/tasks`, { params });
  return response.data;
};

export const createTask = async (data) => {
  const response = await axios.post(`${API_URL}/tasks`, data);
  return response.data;
};

export const updateTask = async (id, data) => {
  const response = await axios.put(`${API_URL}/tasks/${id}`, data);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await axios.delete(`${API_URL}/tasks/${id}`);
  return response.data;
};

// Property endpoints
export const getProperties = async () => {
  const response = await axios.get(`${API_URL}/properties`);
  return response.data;
};

export const getRooms = async (propertyId) => {
  const response = await axios.get(`${API_URL}/properties/${propertyId}/rooms`);
  return response.data;
}; 