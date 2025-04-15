import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';
import { AuthProvider } from '../context/AuthContext';

// Mock the API calls
jest.mock('../services/api', () => ({
  requestPasswordReset: jest.fn(),
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ForgotPassword />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders forgot password form', () => {
    renderComponent();
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
  });

  test('validates required email field', async () => {
    renderComponent();

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'invalid-email' },
    });

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  test('submits form with valid email', async () => {
    const { requestPasswordReset } = require('../services/api');
    requestPasswordReset.mockResolvedValueOnce({
      message: 'Password reset email sent',
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(screen.getByText('Password reset email sent')).toBeInTheDocument();
    });
  });

  test('handles API error on submit', async () => {
    const { requestPasswordReset } = require('../services/api');
    requestPasswordReset.mockRejectedValueOnce(new Error('Email not found'));

    renderComponent();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email not found')).toBeInTheDocument();
    });
  });

  test('navigates to login page', () => {
    renderComponent();

    const loginLink = screen.getByText('Back to Login');
    fireEvent.click(loginLink);

    expect(window.location.pathname).toBe('/login');
  });
}); 