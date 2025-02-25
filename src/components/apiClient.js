import axios from 'axios';

// Use VM's domain instead of localhost
const baseURL = process.env.NODE_ENV === 'development' 
  ? 'http://vm.vasantika.net:5000'
  : 'https://api.modernhotels.management';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Private-Network': 'true'
  }
});

// Function to set auth token
export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Add request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('Response error:', error.response.data);
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // Request was made but no response
      console.error('Network error:', error);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      // Something else happened
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default apiClient;
