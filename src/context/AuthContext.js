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
      const authData = response.data;
      setAuth(authData);
      localStorage.setItem('auth', JSON.stringify(authData));
      return authData;
    } catch (error) {
      throw error;
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