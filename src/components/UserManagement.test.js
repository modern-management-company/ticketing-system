import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import UserManagement from './UserManagement';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  getUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  resetPassword: jest.fn()
}));

import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser,
  resetPassword 
} from './apiClient';

// Mock users data
const mockUsers = [
  {
    user_id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'super_admin',
    created_at: '2023-05-10T08:00:00.000Z',
    updated_at: '2023-05-10T08:00:00.000Z'
  },
  {
    user_id: 2,
    username: 'manager1',
    email: 'manager1@example.com',
    role: 'manager',
    created_at: '2023-05-12T10:30:00.000Z',
    updated_at: '2023-05-12T10:30:00.000Z'
  },
  {
    user_id: 3,
    username: 'technician1',
    email: 'tech1@example.com',
    role: 'technician',
    created_at: '2023-05-15T09:45:00.000Z',
    updated_at: '2023-05-15T09:45:00.000Z'
  },
  {
    user_id: 4,
    username: 'tenant1',
    email: 'tenant1@example.com',
    role: 'tenant',
    created_at: '2023-05-20T14:20:00.000Z',
    updated_at: '2023-05-20T14:20:00.000Z'
  }
];

// Mock context values
const mockAuthContext = {
  isAuthenticated: true,
  user: {
    user_id: 1,
    username: 'admin',
    role: 'super_admin'
  },
  logout: jest.fn()
};

// Mock context hook
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: () => mockAuthContext
}));

// Mocked theme provider for MUI components
const MockThemeProvider = ({ children }) => {
  return children;
};

// Wrapper component with providers
const TestWrapper = ({ children }) => {
  return (
    <MockThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthProvider>
    </MockThemeProvider>
  );
};

describe('UserManagement Component', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
    
    // Mock API responses
    getUsers.mockResolvedValue({ users: mockUsers });
    createUser.mockResolvedValue({ user_id: 5, message: 'User created successfully' });
    updateUser.mockResolvedValue({ message: 'User updated successfully' });
    deleteUser.mockResolvedValue({ message: 'User deleted successfully' });
    resetPassword.mockResolvedValue({ message: 'Password reset link sent' });
    
    // Mock window.confirm to always return true
    window.confirm = jest.fn(() => true);
  });

  test('renders user management component', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Check if component title is displayed
    expect(screen.getByText(/user management/i)).toBeInTheDocument();
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Check if users are displayed
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
    expect(screen.getByText(/manager1/i)).toBeInTheDocument();
    expect(screen.getByText(/technician1/i)).toBeInTheDocument();
    expect(screen.getByText(/tenant1/i)).toBeInTheDocument();
  });

  test('can open create user dialog', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and click the add user button
    const addButton = screen.getByText(/add user/i);
    fireEvent.click(addButton);
    
    // Check if dialog is open
    expect(screen.getByText(/create user/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('can create a new user', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Open create user dialog
    const addButton = screen.getByText(/add user/i);
    fireEvent.click(addButton);
    
    // Fill out the form
    const usernameInput = screen.getByLabelText(/username/i);
    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    
    const roleSelect = screen.getByLabelText(/role/i);
    fireEvent.change(roleSelect, { target: { value: 'manager' } });
    
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if createUser was called with the correct data
    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'newuser@example.com',
        role: 'manager',
        password: 'Password123!'
      });
    });
    
    // Check if users are refreshed after creation
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('validates user form inputs', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Open create user dialog
    const addButton = screen.getByText(/add user/i);
    fireEvent.click(addButton);
    
    // Try to submit with empty fields
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
    
    // Enter invalid email
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    // Check if email validation error is displayed
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
    
    // Check that createUser was not called
    expect(createUser).not.toHaveBeenCalled();
  });

  test('can edit a user', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and click the edit button for a user
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[1]); // Edit the second user (manager1)
    
    // Wait for the edit dialog to appear
    await waitFor(() => {
      expect(screen.getByText(/edit user/i)).toBeInTheDocument();
    });
    
    // The form should be prefilled with user data
    const usernameInput = screen.getByLabelText(/username/i);
    expect(usernameInput.value).toBe('manager1');
    
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput.value).toBe('manager1@example.com');
    
    // Update the email
    fireEvent.change(emailInput, { target: { value: 'manager1-updated@example.com' } });
    
    // Submit the form
    const updateButton = screen.getByRole('button', { name: /update/i });
    fireEvent.click(updateButton);
    
    // Check if updateUser was called with the correct data
    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(2, expect.objectContaining({
        email: 'manager1-updated@example.com'
      }));
    });
    
    // Check if users are refreshed after update
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can delete a user', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and click the delete button for a user
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[3]); // Delete the tenant user
    
    // Confirm deletion in the confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    // Check if deleteUser was called with the correct id
    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith(4); // tenant1's user_id
    });
    
    // Check if users are refreshed after deletion
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can reset a user password', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and click the reset password button for a user
    const resetButtons = screen.getAllByRole('button', { name: /reset password/i });
    fireEvent.click(resetButtons[2]); // Reset password for technician1
    
    // Confirm reset in the confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm password reset/i)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    // Check if resetPassword was called with the correct id
    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith(3); // technician1's user_id
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/password reset link sent/i)).toBeInTheDocument();
    });
  });

  test('can filter users by role', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and click the role filter dropdown
    const roleFilter = screen.getByLabelText(/filter by role/i);
    fireEvent.change(roleFilter, { target: { value: 'manager' } });
    
    // Check if getUsers was called with the correct filter
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledWith(expect.objectContaining({
        role: 'manager'
      }));
    });
  });

  test('can search users by username or email', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and type in the search field
    const searchField = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchField, { target: { value: 'admin' } });
    
    // Simulate search submission (could be triggered by debounce or enter key)
    // For testing, we'll trigger it directly
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledWith(expect.objectContaining({
        search: 'admin'
      }));
    });
  });

  test('can sort users by different columns', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and click the username column header to sort
    const usernameHeader = screen.getByText(/username/i);
    fireEvent.click(usernameHeader);
    
    // Check if sorting parameters were passed to getUsers
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledWith(expect.objectContaining({
        sortBy: 'username',
        sortOrder: 'asc'
      }));
    });
    
    // Click again to change sort order
    fireEvent.click(usernameHeader);
    
    // Check if sorting parameters were updated
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledWith(expect.objectContaining({
        sortBy: 'username',
        sortOrder: 'desc'
      }));
    });
  });

  test('can paginate through users', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and click the next page button
    const nextPageButton = screen.getByLabelText(/next page/i);
    fireEvent.click(nextPageButton);
    
    // Check if pagination parameters were passed to getUsers
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledWith(expect.objectContaining({
        page: 2
      }));
    });
  });

  test('can change the number of users per page', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and change the rows per page dropdown
    const rowsPerPageSelect = screen.getByLabelText(/rows per page/i);
    fireEvent.change(rowsPerPageSelect, { target: { value: '25' } });
    
    // Check if rows per page parameter was passed to getUsers
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledWith(expect.objectContaining({
        limit: 25
      }));
    });
  });

  test('displays proper role labels for users', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Check if role chips are displayed with proper colors
    const roleChips = screen.getAllByText(/super_admin|manager|technician|tenant/i);
    expect(roleChips).toHaveLength(4);
    
    // Check super_admin role chip
    const adminChip = screen.getByText(/super_admin/i);
    expect(adminChip).toHaveClass('MuiChip-colorPrimary');
    
    // Check manager role chip
    const managerChip = screen.getByText(/manager/i);
    expect(managerChip).toHaveClass('MuiChip-colorSecondary');
    
    // Check technician role chip
    const technicianChip = screen.getByText(/technician/i);
    expect(technicianChip).toHaveClass('MuiChip-colorInfo');
    
    // Check tenant role chip
    const tenantChip = screen.getByText(/tenant/i);
    expect(tenantChip).toHaveClass('MuiChip-colorSuccess');
  });
}); 