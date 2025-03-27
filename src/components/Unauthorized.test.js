import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Unauthorized from './Unauthorized';
import { useAuth } from '../context/AuthContext';
import '@testing-library/jest-dom';

// Mock the AuthContext hook
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

describe('Unauthorized Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders unauthorized message with title', () => {
    // Mock empty auth context
    useAuth.mockReturnValue({ auth: null });
    
    render(
      <BrowserRouter>
        <Unauthorized />
      </BrowserRouter>
    );
    
    // Check title is present
    expect(screen.getByText('Unauthorized Access')).toBeInTheDocument();
    
    // Check default message for non-authenticated users
    expect(screen.getByText('Please log in to access this resource.')).toBeInTheDocument();
    
    // Check back to login button
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
  });

  test('renders specific message for authenticated users', () => {
    // Mock auth context with user
    const mockUser = {
      username: 'testuser',
      role: 'staff'
    };
    
    useAuth.mockReturnValue({
      auth: {
        user: mockUser
      }
    });
    
    render(
      <BrowserRouter>
        <Unauthorized />
      </BrowserRouter>
    );
    
    // Check personalized message for authenticated users
    expect(screen.getByText(`User ${mockUser.username} (${mockUser.role}) does not have permission to access this resource.`)).toBeInTheDocument();
  });

  test('renders back to login button with correct link', () => {
    useAuth.mockReturnValue({ auth: null });
    
    render(
      <BrowserRouter>
        <Unauthorized />
      </BrowserRouter>
    );
    
    // Check back to login button has correct link
    const loginButton = screen.getByRole('button', { name: /back to login/i });
    expect(loginButton).toHaveAttribute('href', '/login');
  });

  test('displays error message in red', () => {
    useAuth.mockReturnValue({ auth: null });
    
    render(
      <BrowserRouter>
        <Unauthorized />
      </BrowserRouter>
    );
    
    // Check error title has error color
    const errorTitle = screen.getByText('Unauthorized Access');
    expect(errorTitle).toHaveClass('MuiTypography-colorError');
  });
}); 