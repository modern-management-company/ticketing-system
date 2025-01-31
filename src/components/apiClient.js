import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Logger function
const logger = {
  info: (message, data = null) => {
    const logMessage = data ? `[INFO] ${message} | Data: ${JSON.stringify(data)}` : `[INFO] ${message}`;
    console.log(logMessage);
  },
  error: (message, error = null) => {
    const logMessage = error ? `[ERROR] ${message} | Error: ${JSON.stringify(error)}` : `[ERROR] ${message}`;
    console.error(logMessage);
  },
  warn: (message, data = null) => {
    const logMessage = data ? `[WARN] ${message} | Data: ${JSON.stringify(data)}` : `[WARN] ${message}`;
    console.warn(logMessage);
  }
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add withCredentials for CORS
  withCredentials: true,
  // Increase timeout for slower connections
  timeout: 30000, // 30 seconds
  // Add retry configuration
  retry: 3,
  retryDelay: 1000,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const requestId = Math.random().toString(36).substring(7);
    config.requestId = requestId;

    logger.info(`[${requestId}] Making ${config.method.toUpperCase()} request to ${config.url}`, {
      method: config.method,
      url: config.url,
      data: config.data,
      params: config.params,
      headers: config.headers
    });
    
    const authData = localStorage.getItem('auth');
    if (authData) {
      try {
        const { token } = JSON.parse(authData);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          logger.info(`[${requestId}] Added authorization token to request`);
        }
      } catch (error) {
        logger.error(`[${requestId}] Error parsing auth data`, error);
        localStorage.removeItem('auth');
        window.location.href = '/login';
      }
    } else {
      logger.warn(`[${requestId}] No auth data found in localStorage`);
    }
    return config;
  },
  (error) => {
    logger.error('Request configuration error', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    const requestId = response.config.requestId;
    logger.info(`[${requestId}] Successful response from ${response.config.url}`, {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  async (error) => {
    const { config, response } = error;
    const requestId = config?.requestId;

    // If the error is a timeout
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      logger.warn(`[${requestId}] Request timed out`, {
        url: config.url,
        timeout: config.timeout
      });
      
      const shouldRetry = config.retry > 0;
      
      if (shouldRetry) {
        config.retry -= 1;
        logger.info(`[${requestId}] Retrying request. Attempts remaining: ${config.retry}`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        return apiClient(config);
      }
    }

    logger.error(`[${requestId}] Request failed`, {
      url: config?.url,
      method: config?.method,
      status: response?.status,
      data: response?.data,
      error: error.message,
      stack: error.stack
    });

    // Handle specific error cases
    if (response?.status === 401) {
      logger.warn(`[${requestId}] Authentication failed - clearing auth data`);
      localStorage.removeItem('auth');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }
    
    if (response?.status === 422) {
      logger.error(`[${requestId}] Validation error`, response.data);
      return Promise.reject(new Error(response.data.message || 'Validation failed'));
    }
    
    if (response?.status >= 500) {
      logger.error(`[${requestId}] Server error`, response.data);
      return Promise.reject(new Error('An unexpected error occurred. Please try again later.'));
    }
    
    if (!response) {
      if (error.code === 'ECONNABORTED') {
        logger.error(`[${requestId}] Request timeout`, error);
        return Promise.reject(new Error('Request timed out. Please try again.'));
      }
      logger.error(`[${requestId}] Network error`, error);
      return Promise.reject(new Error('Unable to connect to the server. Please check your internet connection.'));
    }
    
    return Promise.reject(error);
  }
);

// Add a ping method to check server connectivity
apiClient.ping = async () => {
  try {
    logger.info('Checking server connectivity...');
    const response = await apiClient.get('/ping', { timeout: 5000 });
    logger.info('Server is reachable', response.data);
    return true;
  } catch (error) {
    logger.error('Server is not reachable', error);
    return false;
  }
};

export default apiClient;
