import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from './Profile';
import { AuthProvider } from '../context/AuthContext';

// Mock the API calls
jest.mock('../services/api', () => ({
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  changePassword: jest.fn(),
}));

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  created_at: '2024-01-01T00:00:00Z',
};

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Profile />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Profile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders profile information', async () => {
    const { getUserProfile } = require('../services/api');
    getUserProfile.mockResolvedValueOnce(mockUser);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
    });
  });

  test('handles profile update', async () => {
    const { getUserProfile, updateUserProfile } = require('../services/api');
    getUserProfile.mockResolvedValueOnce(mockUser);
    updateUserProfile.mockResolvedValueOnce({
      ...mockUser,
      username: 'updateduser',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'updateduser' },
    });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith({
        username: 'updateduser',
      });
      expect(screen.getByText('updateduser')).toBeInTheDocument();
    });
  });

  test('handles password change', async () => {
    const { getUserProfile, changePassword } = require('../services/api');
    getUserProfile.mockResolvedValueOnce(mockUser);
    changePassword.mockResolvedValueOnce({
      message: 'Password changed successfully',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const changePasswordButton = screen.getByText('Change Password');
    fireEvent.click(changePasswordButton);

    fireEvent.change(screen.getByLabelText('Current Password'), {
      target: { value: 'current123' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'newpassword123' },
    });

    const saveButton = screen.getByText('Update Password');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        current_password: 'current123',
        new_password: 'newpassword123',
      });
      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
    });
  });

  test('validates password change form', async () => {
    const { getUserProfile } = require('../services/api');
    getUserProfile.mockResolvedValueOnce(mockUser);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const changePasswordButton = screen.getByText('Change Password');
    fireEvent.click(changePasswordButton);

    const saveButton = screen.getByText('Update Password');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Current Password is required')).toBeInTheDocument();
      expect(screen.getByText('New Password is required')).toBeInTheDocument();
      expect(screen.getByText('Confirm New Password is required')).toBeInTheDocument();
    });
  });

  test('handles API errors', async () => {
    const { getUserProfile, updateUserProfile } = require('../services/api');
    getUserProfile.mockResolvedValueOnce(mockUser);
    updateUserProfile.mockRejectedValueOnce(new Error('Update failed'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'updateduser' },
    });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  test('displays loading state', () => {
    const { getUserProfile } = require('../services/api');
    getUserProfile.mockImplementation(() => new Promise(() => {}));

    renderComponent();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
}); 