import axios from 'axios';

// API URL based on environment
const API_URL = 'http://localhost:5000';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute in milliseconds

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Export constants for use in other files
export { MAX_RETRIES };

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Add these settings for CORS
  withCredentials: true
});

// Check if we have internet connection
const checkOnline = () => {
  return navigator.onLine;
};

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

// Add request interceptor to handle errors and caching
apiClient.interceptors.request.use(
  (config) => {
    // Special handling for authentication-related endpoints
    if (config.url === '/logout' || config.url === '/login' || config.url === '/refresh') {
      config.timeout = 5000; // Shorter timeout for auth requests
      config.retryCount = MAX_RETRIES; // Don't retry auth requests
      config.noCache = true; // Don't cache auth requests
      return config;
    }
    
    // Special handling for token verification - use a shorter timeout and cache results
    if (config.url === '/verify-token') {
      config.timeout = 5000; // Shorter timeout for verification
      
      // Only cache verification results for 5 minutes
      const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
      const cachedResponse = cache.get(cacheKey);
      
      if (cachedResponse && (Date.now() - cachedResponse.timestamp < 5 * 60 * 1000)) {
        console.log('Using cached verification response');
        return Promise.resolve(cachedResponse);
      }
      
      return config;
    }
    
    // Skip caching for non-GET requests or requests that specify no caching
    if (config.method !== 'get' || config.noCache) {
      return config;
    }

    // Check if we're offline
    if (!checkOnline()) {
      console.warn('Device is offline. Checking cache for:', config.url);
      const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
      const cachedResponse = cache.get(cacheKey);
      
      if (cachedResponse) {
        console.log('Using cached response for:', config.url);
        // Return a promise that resolves with the cached response
        return Promise.resolve(cachedResponse);
      }
    }

    const auth = getStoredAuth();
    if (auth?.token) {
      // Ensure token is always properly formatted with Bearer prefix
      const token = auth.token.startsWith('Bearer ') ? auth.token : `Bearer ${auth.token}`;
      config.headers.Authorization = token;
    }
    
    // Add retry count to config
    config.retryCount = config.retryCount || 0;
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh and caching
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get' && !response.config.noCache) {
      const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
      
      // Store in cache with timestamp
      cache.set(cacheKey, {
        ...response,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries
      setTimeout(() => {
        const now = Date.now();
        cache.forEach((value, key) => {
          if (now - value.timestamp > CACHE_DURATION) {
            cache.delete(key);
          }
        });
      }, 0);
    }
    
    return response;
  },
  async (error) => {
    // If we have a cached response for this request and we're offline or it's a timeout
    if (error.config?.method === 'get' && 
        (!checkOnline() || error.code === 'ECONNABORTED')) {
      const cacheKey = `${error.config.url}${JSON.stringify(error.config.params || {})}`;
      const cachedResponse = cache.get(cacheKey);
      
      if (cachedResponse) {
        console.log('Network error, using cached response for:', error.config.url);
        return Promise.resolve(cachedResponse);
      }
    }
    
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }
    
    // Handle timeout errors with retry logic
    if (error.code === 'ECONNABORTED' && error.message && error.message.includes('timeout')) {
      if (originalRequest.retryCount < MAX_RETRIES) {
        originalRequest.retryCount += 1;
        console.log(`Request timed out. Retrying (${originalRequest.retryCount}/${MAX_RETRIES})...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        
        return apiClient(originalRequest);
      } else {
        console.error(`Request failed after ${MAX_RETRIES} retries:`, error);
        return Promise.reject(new Error(`Request timed out after ${MAX_RETRIES} retries. The server might be down or unreachable.`));
      }
    }
    
    // If the error is not 401 or the request already tried to refresh, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    
    // If we're already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }
    
    originalRequest._retry = true;
    isRefreshing = true;
    
    const auth = getStoredAuth();
    if (!auth?.refresh_token) {
      processQueue(new Error('No refresh token available'));
      isRefreshing = false;
      return Promise.reject(error);
    }
    
    try {
      // Try to refresh the token
      const refreshResponse = await axios.post(
        `${API_URL}/refresh`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${auth.refresh_token}`
          },
          withCredentials: true,
          timeout: 15000 // 15 seconds timeout for refresh requests
        }
      );
      
      const { token, user } = refreshResponse.data;
      
      // Update stored auth data
      const updatedAuth = {
        ...auth,
        token,
        user,
        isAuthenticated: true
      };
      
      localStorage.setItem('auth', JSON.stringify(updatedAuth));
      setAuthToken(token);
      
      // Update the original request with the new token
      originalRequest.headers['Authorization'] = `Bearer ${token}`;
      
      // Process the queue with the new token
      processQueue(null, token);
      isRefreshing = false;
      
      // Retry the original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      isRefreshing = false;
      
      // If refresh fails, clear auth data
      localStorage.removeItem('auth');
      setAuthToken(null);
      
      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      
      return Promise.reject(refreshError);
    }
  }
);

// Add a method to clear the cache
apiClient.clearCache = () => {
  cache.clear();
  console.log('API cache cleared');
};

// Add a method to prefetch data
apiClient.prefetch = async (url, params = {}) => {
  try {
    const response = await apiClient.get(url, { params });
    return response.data;
  } catch (error) {
    console.error('Prefetch error:', error);
    return null;
  }
};

export default apiClient;