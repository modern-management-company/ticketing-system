import axios from 'axios';

// Hardcode the API URL to ensure it's always used
const API_URL = 'https://ticketing-system-6f4u.onrender.com';
console.log('Using API URL:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Add these settings for CORS
  withCredentials: true
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

// Function to set auth token
export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Add request interceptor to handle errors
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

// Add response interceptor with better error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Log detailed error information
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      // Handle specific error codes
      switch (error.response.status) {
        case 405:
          console.error('Method not allowed. Please check API endpoint configuration');
          break;
        case 401:
          console.error('Unauthorized access');
          break;
        case 403:
          console.error('Forbidden access');
          break;
        default:
          console.error('Server error:', error.response.status);
      }
      return Promise.reject(error);
    } else if (error.request) {
      // Handle network errors and timeouts more gracefully
      if (error.code === 'ECONNABORTED') {
        console.log('Request timeout:', error.message);
      } else {
        console.log('Network issue:', error.message);
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default apiClient;