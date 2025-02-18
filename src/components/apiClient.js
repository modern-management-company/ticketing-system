import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  // Add these settings for CORS
  withCredentials: true,
  credentials: 'include'
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const getStoredAuth = () => {
  try {
    const auth = localStorage.getItem('auth');
    return auth ? JSON.parse(auth) : null;
  } catch (error) {
    console.error('Error parsing stored auth:', error);
    localStorage.removeItem('auth');
    return null;
  }
};

apiClient.interceptors.request.use(
  (config) => {
    const auth = getStoredAuth();
    if (auth?.token) {
      // Ensure token is always properly formatted with Bearer prefix
      const token = auth.token.startsWith('Bearer ') ? auth.token : `Bearer ${auth.token}`;
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Handle response errors
      return Promise.reject(error);
    } else if (error.request) {
      // Handle CORS and network errors
      console.error('Network error:', error);
      throw new Error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
