import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://ticketing-system-6f4u.onrender.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle connection errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }

    if (!error.response) {
      console.error('Network error:', error);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    const status = error.response.status;
    const errorMessage = error.response.data?.msg || error.message;
    
    // Handle authentication errors
    if (status === 401 || status === 422) {
      console.warn('Authentication error:', status, errorMessage);
      
      // Clear invalid auth data
      localStorage.removeItem('auth');
      delete apiClient.defaults.headers.common['Authorization'];
      
      // Don't redirect if already on login page or handling a retry
      if (!window.location.pathname.includes('/login') && !originalRequest._retry) {
        window.location.href = '/login';
      }
      return Promise.reject(new Error(errorMessage || 'Authentication required'));
    }

    // Implement retry logic for 5xx errors
    if (status >= 500 && !originalRequest._retry && originalRequest.retryCount < MAX_RETRIES) {
      originalRequest._retry = true;
      originalRequest.retryCount = (originalRequest.retryCount || 0) + 1;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * originalRequest.retryCount));
      
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;