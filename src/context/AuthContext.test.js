import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import '@testing-library/jest-dom';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Save original localStorage
const originalLocalStorage = global.localStorage;

// Test component that uses the auth context
const TestComponent = () => {
  const { isAuthenticated, user, login, logout } = useAuth();
  
  const handleLogin = () => {
    login('test-token', { username: 'testuser', role: 'user' });
  };
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      {user && (
        <div data-testid="user-info">
          {user.username} - {user.role}
        </div>
      )}
      <button onClick={handleLogin} data-testid="login-button">
        Login
      </button>
      <button onClick={logout} data-testid="logout-button">
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeAll(() => {
    // Replace localStorage with mock
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
  });
  
  afterAll(() => {
    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders children', () => {
    render(
      <AuthProvider>
        <div data-testid="child">Test Child</div>
      </AuthProvider>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
  
  test('initializes as not authenticated when no token exists', () => {
    // Mock localStorage.getItem to return null (no token)
    mockLocalStorage.getItem.mockReturnValue(null);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
  });
  
  test('initializes as authenticated when token exists', () => {
    // Mock localStorage.getItem to return a token
    mockLocalStorage.getItem.mockReturnValueOnce('test-token');
    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({
      username: 'testuser',
      role: 'user'
    }));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-info')).toHaveTextContent('testuser - user');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('user');
  });
  
  test('login sets authenticated state and stores token', async () => {
    // Mock localStorage.getItem to return null (no token)
    mockLocalStorage.getItem.mockReturnValue(null);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initial state should be not authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    
    // Click login button to trigger login
    fireEvent.click(screen.getByTestId('login-button'));
    
    // Check if state was updated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-info')).toHaveTextContent('testuser - user');
    
    // Check if localStorage was updated
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify({
      username: 'testuser',
      role: 'user'
    }));
  });
  
  test('logout clears authenticated state and removes token', async () => {
    // Mock localStorage.getItem to return a token
    mockLocalStorage.getItem.mockReturnValueOnce('test-token');
    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({
      username: 'testuser',
      role: 'user'
    }));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initial state should be authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    
    // Click logout button to trigger logout
    fireEvent.click(screen.getByTestId('logout-button'));
    
    // Check if state was updated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    
    // Check if localStorage was cleared
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
  });
}); 