import React, { createContext, useContext, useState } from 'react';
import apiClient from '../components/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const savedAuth = localStorage.getItem('auth');
    return savedAuth ? JSON.parse(savedAuth) : null;
  });

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/login', { username, password });
      const authData = {
        token: response.data.token,
        userId: response.data.userId,
        username: response.data.username,
        role: response.data.role
      };
      setAuth(authData);
      localStorage.setItem('auth', JSON.stringify(authData));
      return authData;
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to connect to the server');
    }
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem('auth');
  };

  const checkFirstUser = async () => {
    try {
      const response = await apiClient.get('/users/check-first');
      return response.data.isFirstUser;
    } catch (error) {
      console.error('Failed to check first user status:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout, checkFirstUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 