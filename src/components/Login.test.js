import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../context/AuthContext';

// Mock the API calls
jest.mock('../services/api', () => ({
  login: jest.fn(),
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form', () => {
    renderComponent();
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    renderComponent();

    const submitButton = screen.getByText('Login');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'invalid-email' },
    });

    const submitButton = screen.getByText('Login');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    const { login } = require('../services/api');
    login.mockResolvedValueOnce({
      access_token: 'test-token',
      refresh_token: 'refresh-token',
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByText('Login');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  test('handles API error on submit', async () => {
    const { login } = require('../services/api');
    login.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderComponent();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' },
    });

    const submitButton = screen.getByText('Login');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('navigates to register page', () => {
    renderComponent();

    const registerLink = screen.getByText('Register');
    fireEvent.click(registerLink);

    expect(window.location.pathname).toBe('/register');
  });

  test('navigates to forgot password page', () => {
    renderComponent();

    const forgotPasswordLink = screen.getByText('Forgot Password?');
    fireEvent.click(forgotPasswordLink);

    expect(window.location.pathname).toBe('/forgot-password');
  });
}); 