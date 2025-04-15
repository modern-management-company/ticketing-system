import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import { AuthProvider } from '../context/AuthContext';

// Mock the API calls
jest.mock('../services/api', () => ({
  resetPassword: jest.fn(),
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ResetPassword />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ResetPassword Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders reset password form', () => {
    renderComponent();
    
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    renderComponent();

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New Password is required')).toBeInTheDocument();
      expect(screen.getByText('Confirm New Password is required')).toBeInTheDocument();
    });
  });

  test('validates password match', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'different-password' },
    });

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  test('validates password strength', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'weak' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'weak' },
    });

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    const { resetPassword } = require('../services/api');
    resetPassword.mockResolvedValueOnce({
      message: 'Password reset successful',
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        token: expect.any(String),
        new_password: 'password123',
      });
      expect(screen.getByText('Password reset successful')).toBeInTheDocument();
    });
  });

  test('handles API error on submit', async () => {
    const { resetPassword } = require('../services/api');
    resetPassword.mockRejectedValueOnce(new Error('Invalid or expired token'));

    renderComponent();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired token')).toBeInTheDocument();
    });
  });

  test('navigates to login page after successful reset', async () => {
    const { resetPassword } = require('../services/api');
    resetPassword.mockResolvedValueOnce({
      message: 'Password reset successful',
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'password123' },
    });

    const submitButton = screen.getByText('Reset Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });
}); 