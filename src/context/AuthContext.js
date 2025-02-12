import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiClient from '../components/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [auth, setAuth] = useState(null);

  const checkFirstUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/check-first-user');
      return response.data.isFirstUser;
    } catch (error) {
      console.error('Error checking first user:', error);
      return false;
    }
  }, []);

  const verifyToken = useCallback(async (token) => {
    try {
      // Ensure token is properly formatted with Bearer prefix
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      apiClient.defaults.headers.common['Authorization'] = formattedToken;
      
      const response = await apiClient.get('/verify-token');
      if (!response.data.valid) {
        throw new Error(response.data.msg || 'Token verification failed');
      }
      return response.data;
    } catch (error) {
      console.error('Token verification failed:', error);
      delete apiClient.defaults.headers.common['Authorization'];
      throw error;
    }
  }, []);

  const login = useCallback(async (data) => {
    try {
      if (!data.token || !data.user) {
        throw new Error('Invalid login data');
      }

      // Store auth data first
      const authData = {
        token: data.token,
        user: data.user,
        isAuthenticated: true
      };
      
      // Verify token before storing
      const verificationResult = await verifyToken(data.token);
      
      // Update user data with verified data
      authData.user = verificationResult.user;
      
      // Store verified data
      localStorage.setItem('auth', JSON.stringify(authData));
      
      // Set auth state
      setAuth(authData);
    } catch (error) {
      console.error('Error in login:', error);
      // Clean up on error
      localStorage.removeItem('auth');
      delete apiClient.defaults.headers.common['Authorization'];
      setAuth(null);
      throw error;
    }
  }, [verifyToken]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth');
    delete apiClient.defaults.headers.common['Authorization'];
    setAuth(null);
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedAuth = localStorage.getItem('auth');
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          
          if (authData.token) {
            try {
              // Verify the token is still valid
              const verificationResult = await verifyToken(authData.token);
              if (verificationResult.valid) {
                // Update auth data with latest user info
                const updatedAuthData = {
                  ...authData,
                  user: verificationResult.user
                };
                localStorage.setItem('auth', JSON.stringify(updatedAuthData));
                setAuth(updatedAuthData);
              } else {
                throw new Error('Token verification failed');
              }
            } catch (error) {
              console.warn('Stored token is invalid:', error);
              localStorage.removeItem('auth');
              delete apiClient.defaults.headers.common['Authorization'];
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('auth');
        delete apiClient.defaults.headers.common['Authorization'];
      } finally {
        setInitialized(true);
      }
    };

    initAuth();
  }, [verifyToken]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, initialized, checkFirstUser }}>
      {children}
    </AuthContext.Provider>
  );
}; 