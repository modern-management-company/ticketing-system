import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import apiClient, { setAuthToken, MAX_RETRIES } from '../components/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    // Initialize from localStorage if available
    const storedAuth = localStorage.getItem('auth');
    return storedAuth ? JSON.parse(storedAuth) : null;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [properties, setProperties] = useState([]);
  const [propertiesLastFetched, setPropertiesLastFetched] = useState(0);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  // Save to localStorage whenever auth changes
  useEffect(() => {
    if (auth) {
      localStorage.setItem('auth', JSON.stringify(auth));
      // Set the token in API client
      setAuthToken(auth.token);
    } else {
      localStorage.removeItem('auth');
      setAuthToken(null);
    }
  }, [auth]);

  // Fetch properties with caching
  const fetchProperties = useCallback(async (forceRefresh = false) => {
    // Don't fetch if not authenticated
    if (!auth?.isAuthenticated || !auth?.token) {
      return [];
    }

    // Check if we have cached properties and they're not too old (5 minutes)
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    if (!forceRefresh && 
        properties.length > 0 && 
        now - propertiesLastFetched < CACHE_DURATION) {
      console.log('Using cached properties');
      return properties;
    }

    try {
      setPropertiesLoading(true);
      
      // Check if we have properties in sessionStorage
      const cachedProperties = sessionStorage.getItem('cachedProperties');
      const cachedTime = sessionStorage.getItem('propertiesLastFetched');
      
      if (!forceRefresh && 
          cachedProperties && 
          cachedTime && 
          now - parseInt(cachedTime, 10) < CACHE_DURATION) {
        console.log('Using sessionStorage cached properties');
        const parsedProperties = JSON.parse(cachedProperties);
        setProperties(parsedProperties);
        setPropertiesLastFetched(parseInt(cachedTime, 10));
        setPropertiesLoading(false);
        return parsedProperties;
      }
      
      // Fetch properties from API
      const response = await apiClient.get('/properties');
      const fetchedProperties = response.data;
      
      // Cache the properties
      setProperties(fetchedProperties);
      setPropertiesLastFetched(now);
      
      // Also cache in sessionStorage
      sessionStorage.setItem('cachedProperties', JSON.stringify(fetchedProperties));
      sessionStorage.setItem('propertiesLastFetched', now.toString());
      
      return fetchedProperties;
    } catch (error) {
      console.error('Error fetching properties:', error);
      return properties; // Return existing properties on error
    } finally {
      setPropertiesLoading(false);
    }
  }, [auth?.isAuthenticated, auth?.token, properties, propertiesLastFetched]);

  // Prefetch common data when authenticated
  useEffect(() => {
    const prefetchData = async () => {
      if (auth?.isAuthenticated && auth?.token) {
        try {
          // Prefetch properties
          await fetchProperties();
        } catch (error) {
          console.error('Error prefetching data:', error);
        }
      }
    };

    prefetchData();
  }, [auth?.isAuthenticated, auth?.token, fetchProperties]);

  const checkFirstUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/check-first-user');
      return response.data.isFirstUser;
    } catch (error) {
      console.error('Error checking first user:', error);
      return false;
    }
  }, []);

  const refreshToken = useCallback(async () => {
    // Prevent multiple simultaneous refresh attempts
    if (refreshing) {
      console.log('Token refresh already in progress, skipping');
      return false;
    }
    
    try {
      setRefreshing(true);
      const savedAuth = localStorage.getItem('auth');
      if (!savedAuth) {
        console.log('No stored auth data for token refresh');
        return false;
      }

      const authData = JSON.parse(savedAuth);
      if (!authData.refresh_token) {
        console.log('No refresh token available');
        return false;
      }

      // Check if we've tried refreshing recently (within the last minute)
      const lastRefreshAttempt = sessionStorage.getItem('lastRefreshAttempt');
      const now = Date.now();
      
      if (lastRefreshAttempt && now - parseInt(lastRefreshAttempt, 10) < 60000) {
        console.log('Token refresh attempted too recently, skipping');
        return false;
      }
      
      // Mark that we're attempting a refresh
      sessionStorage.setItem('lastRefreshAttempt', now.toString());

      console.log('Attempting to refresh token');
      const response = await apiClient.post('/refresh', {}, {
        headers: {
          'Authorization': `Bearer ${authData.refresh_token}`
        },
        timeout: 15000 // 15 second timeout
      });

      const { token, user } = response.data;
      
      if (!token) {
        console.error('No token received from refresh endpoint');
        return false;
      }
      
      // Update stored auth data
      const updatedAuth = {
        ...authData,
        token,
        user,
        isAuthenticated: true
      };
      
      localStorage.setItem('auth', JSON.stringify(updatedAuth));
      setAuth(updatedAuth);
      setAuthToken(token);
      
      // Update token verification cache
      sessionStorage.setItem('lastTokenVerified', Date.now().toString());
      sessionStorage.setItem('verifiedToken', token);
      sessionStorage.setItem('verifiedUser', JSON.stringify(user));
      
      // Don't clear property cache on token refresh
      // This ensures we maintain the property cache across token refreshes
      console.log('Token refresh successful');
      return updatedAuth;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Clear the refresh attempt timestamp so we can try again soon if needed
      sessionStorage.removeItem('lastRefreshAttempt');
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  // Token verification with caching
  const verifyToken = useCallback(async (token) => {
    // Check if token is valid
    if (!token) {
      console.error('No token provided for verification');
      return { valid: false };
    }
    
    // Check if we've verified this token recently (within the last 5 minutes)
    const lastVerified = sessionStorage.getItem('lastTokenVerified');
    const verifiedToken = sessionStorage.getItem('verifiedToken');
    const verifiedUser = sessionStorage.getItem('verifiedUser');
    
    const now = Date.now();
    const VERIFICATION_CACHE_TIME = 15 * 60 * 1000; // Increase to 15 minutes
    
    // If we have a cached verification that's still valid and it's the same token
    if (lastVerified && verifiedToken && verifiedUser && 
        token === verifiedToken && 
        now - parseInt(lastVerified, 10) < VERIFICATION_CACHE_TIME) {
      console.log('Using cached token verification');
      try {
        const user = JSON.parse(verifiedUser);
        if (user) {
          return {
            valid: true,
            user: user
          };
        }
      } catch (error) {
        console.error('Error parsing cached user data:', error);
        // Continue with server verification
      }
    }
    
    // Before making a network request, check if we're online
    if (!navigator.onLine) {
      console.warn('Device is offline. Using cached data if available.');
      if (verifiedUser && verifiedToken) {
        try {
          const user = JSON.parse(verifiedUser);
          return {
            valid: true,
            user: user,
            fromCache: true
          };
        } catch (error) {
          console.error('Error parsing cached user data in offline mode:', error);
        }
      }
      // If we're offline and don't have cached data, return invalid
      return { valid: false, offlineMode: true };
    }
    
    try {
      // Set auth token for this request
      setAuthToken(token);
      
      // Verify token with server - using a more reasonable timeout
      const response = await apiClient.get('/verify-token', {
        timeout: 15000, // 15 second timeout for verification
        headers: {
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
        }
      });
      
      // Validate the user data from the response
      if (!response.data || !response.data.user) {
        console.error('Invalid user data in verification response:', response.data);
        return { valid: false };
      }
      
      // Cache the verification result
      sessionStorage.setItem('lastTokenVerified', now.toString());
      sessionStorage.setItem('verifiedToken', token);
      sessionStorage.setItem('verifiedUser', JSON.stringify(response.data.user));
      
      return {
        valid: true,
        user: response.data.user
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      
      // For network errors, if we have a cached user, use it temporarily
      if ((error.code === 'ECONNABORTED' || 
           error.message?.includes('timeout') || 
           error.message?.includes('Network Error')) && 
          verifiedUser && verifiedToken === token) {
        console.warn('Network error during verification. Using cached user data.');
        try {
          const user = JSON.parse(verifiedUser);
          if (user) {
            return {
              valid: true,
              user: user,
              fromCache: true
            };
          }
        } catch (innerError) {
          console.error('Error parsing cached user data after network error:', innerError);
        }
      }
      
      // If the error is something else, or we don't have cached data, return invalid
      return { valid: false, error: error.message };
    }
  }, []);

  const login = useCallback(async (data) => {
    try {
      // Validate login data
      if (!data || !data.token || !data.user) {
        console.error('Invalid login data received:', data);
        throw new Error('Invalid login data');
      }

      // Store auth data first
      const authData = {
        token: data.token,
        refresh_token: data.refresh_token,
        user: data.user,
        isAuthenticated: true
      };
      
      try {
        // Verify token before storing
        const verificationResult = await verifyToken(data.token);
        
        if (!verificationResult.valid) {
          console.error('Token verification failed during login');
          throw new Error('Token verification failed');
        }
        
        // Update user data with verified data
        authData.user = verificationResult.user;
      } catch (verifyError) {
        console.error('Error verifying token during login:', verifyError);
        // If verification fails due to network issues, continue with the login data
        if (!(verifyError.code === 'ECONNABORTED' || 
              verifyError.message?.includes('timeout') || 
              verifyError.message?.includes('Network Error'))) {
          throw verifyError;
        }
        console.warn('Using unverified user data due to network issues');
      }
      
      // Store verified data
      localStorage.setItem('auth', JSON.stringify(authData));
      
      // Set auth state and token
      setAuth(authData);
      setAuthToken(data.token);
      
      // Clear property cache to force refresh on login
      sessionStorage.removeItem('cachedProperties');
      sessionStorage.removeItem('propertiesLastFetched');
      setProperties([]);
      setPropertiesLastFetched(0);
      
      // Clear API cache on login to ensure fresh data
      if (typeof apiClient.clearCache === 'function') {
        apiClient.clearCache();
      }
      
      return authData;
    } catch (error) {
      console.error('Error in login:', error);
      // Clean up on error
      localStorage.removeItem('auth');
      setAuthToken(null);
      setAuth(null);
      throw error;
    }
  }, [verifyToken]);

  const logout = useCallback(async () => {
    try {
      // Only attempt server logout if we have a token
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsedAuth = JSON.parse(authData);
        
        if (parsedAuth?.token) {
          // Set the token before logout call
          setAuthToken(parsedAuth.token);
          
          // Simple logout - no retry, short timeout, ignore errors
          try {
            await apiClient.post('/logout', {}, {
              timeout: 3000, // Very short timeout
              retries: 0, // No retries
            });
            console.log('Server logout successful');
          } catch (error) {
            // Just log the error and continue with local logout
            console.warn('Server logout failed, continuing with local logout:', error.message);
          }
        }
      }
    } catch (error) {
      console.warn('Error during logout attempt:', error.message);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem('auth');
      sessionStorage.removeItem('verifiedToken');
      sessionStorage.removeItem('verifiedUser');
      sessionStorage.removeItem('lastTokenVerified');
      sessionStorage.removeItem('cachedProperties');
      sessionStorage.removeItem('propertiesLastFetched');
      sessionStorage.removeItem('lastRefreshAttempt');
            
      // Clear auth state
      setAuth(null);
      setAuthToken(null);
      
      // Clear API cache
      apiClient.clearCache && apiClient.clearCache();
      
      // Instead of navigating, reload the page to ensure a clean state
      window.location.href = '/login';
    }
  }, []);

  // Setup token refresh interval - reduced frequency
  useEffect(() => {
    if (auth?.token) {
      // Refresh token every 12 hours instead of 6
      const refreshInterval = setInterval(() => {
        refreshToken().catch(console.error);
      }, 12 * 60 * 60 * 1000); // 12 hours
      
      return () => clearInterval(refreshInterval);
    }
  }, [auth, refreshToken]);

  // Add a listener for storage events to sync auth state across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Handle auth changes
      if (e.key === 'auth') {
        if (e.newValue) {
          try {
            const newAuth = JSON.parse(e.newValue);
            // Ensure the auth object has all required properties
            if (newAuth && newAuth.token && newAuth.user) {
              setAuth(newAuth);
              setAuthToken(newAuth.token);
            } else {
              console.error('Invalid auth data in storage event:', newAuth);
              // Clear invalid auth data
              localStorage.removeItem('auth');
              setAuth(null);
              setAuthToken(null);
              window.location.href = '/login';
            }
          } catch (error) {
            console.error('Error parsing auth from storage event:', error);
            // Clear invalid auth data
            localStorage.removeItem('auth');
            setAuth(null);
            setAuthToken(null);
            window.location.href = '/login';
          }
        } else {
          // Auth was cleared in another tab
          setAuth(null);
          setAuthToken(null);
          window.location.href = '/login';
        }
      }
      
      // Handle property cache changes
      if (e.key === 'cachedProperties') {
        if (e.newValue) {
          try {
            const newProperties = JSON.parse(e.newValue);
            setProperties(newProperties);
          } catch (error) {
            console.error('Error parsing properties from storage event:', error);
          }
        } else {
          // Properties were cleared in another tab
          setProperties([]);
        }
      }
      
      if (e.key === 'propertiesLastFetched') {
        if (e.newValue) {
          try {
            setPropertiesLastFetched(parseInt(e.newValue, 10));
          } catch (error) {
            console.error('Error parsing propertiesLastFetched from storage event:', error);
          }
        } else {
          // Last fetched time was cleared in another tab
          setPropertiesLastFetched(0);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we've initialized auth recently (within the last 5 minutes)
        const lastInitTime = sessionStorage.getItem('lastAuthInit');
        const now = Date.now();
        const AUTH_INIT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
        
        // If we've initialized auth recently, use the cached auth data
        if (lastInitTime && now - parseInt(lastInitTime, 10) < AUTH_INIT_CACHE_TIME) {
          console.log('Using cached auth initialization');
          const savedAuth = localStorage.getItem('auth');
          if (savedAuth) {
            try {
              const authData = JSON.parse(savedAuth);
              // Validate the auth data
              if (authData && authData.token && authData.user && authData.isAuthenticated) {
                setAuth(authData);
                setAuthToken(authData.token);
                
                // Load cached properties if available
                const cachedProperties = sessionStorage.getItem('cachedProperties');
                const cachedTime = sessionStorage.getItem('propertiesLastFetched');
                
                if (cachedProperties && cachedTime) {
                  try {
                    setProperties(JSON.parse(cachedProperties));
                    setPropertiesLastFetched(parseInt(cachedTime, 10));
                  } catch (parseError) {
                    console.error('Error parsing cached properties:', parseError);
                  }
                }
                
                setLoading(false);
                return;
              } else {
                console.warn('Invalid cached auth data, performing full initialization');
              }
            } catch (error) {
              console.error('Error parsing cached auth data:', error);
            }
          }
        }
        
        // Otherwise, perform a full auth initialization
        const savedAuth = localStorage.getItem('auth');
        if (savedAuth) {
          try {
            const authData = JSON.parse(savedAuth);
            
            // Validate the auth data
            if (!authData || !authData.token || !authData.user) {
              console.warn('Invalid stored auth data');
              localStorage.removeItem('auth');
              setAuth(null);
              setAuthToken(null);
              setLoading(false);
              return;
            }
            
            // Verify the token is still valid
            const verificationResult = await verifyToken(authData.token);
            if (verificationResult.valid) {
              // Update auth data with latest user info
              const updatedAuthData = {
                ...authData,
                user: verificationResult.user,
                isAuthenticated: true
              };
              localStorage.setItem('auth', JSON.stringify(updatedAuthData));
              setAuth(updatedAuthData);
              setAuthToken(authData.token);
              
              // Cache the initialization time
              sessionStorage.setItem('lastAuthInit', now.toString());
            } else {
              throw new Error('Token verification failed');
            }
          } catch (error) {
            console.warn('Stored token is invalid, attempting refresh:', error);
            
            // Don't immediately log out for network errors
            if (error.code === 'ECONNABORTED' || 
                error.message?.includes('timeout') || 
                error.message?.includes('Network Error')) {
              console.warn('Network error during initialization. Using stored auth data temporarily.');
              
              // Validate the auth data before using it
              try {
                const authData = JSON.parse(savedAuth);
                if (authData && authData.token && authData.user) {
                  setAuth(authData);
                  setAuthToken(authData.token);
                } else {
                  throw new Error('Invalid auth data');
                }
              } catch (parseError) {
                console.error('Error parsing auth data:', parseError);
                localStorage.removeItem('auth');
                setAuth(null);
                setAuthToken(null);
              }
            } else {
              // Try to refresh the token
              try {
                const refreshed = await refreshToken();
                if (refreshed) {
                  // Cache the initialization time
                  sessionStorage.setItem('lastAuthInit', now.toString());
                } else {
                  // Clear auth data if refresh fails
                  localStorage.removeItem('auth');
                  setAuth(null);
                  setAuthToken(null);
                }
              } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                localStorage.removeItem('auth');
                setAuth(null);
                setAuthToken(null);
              }
            }
          }
        } else {
          // No stored auth data
          setAuth(null);
          setAuthToken(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('auth');
        setAuth(null);
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [verifyToken, refreshToken]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    auth,
    login,
    logout,
    checkFirstUser,
    refreshToken,
    loading,
    fetchProperties,
    properties,
    propertiesLoading
  }), [
    auth, 
    login, 
    logout, 
    checkFirstUser, 
    refreshToken, 
    loading, 
    fetchProperties,
    properties,
    propertiesLoading
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 