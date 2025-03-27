import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import { useAuth } from '../context/AuthContext';
import '@testing-library/jest-dom';

// Mock the AuthContext hook
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
}));

// Mock Outlet component
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
}));

describe('Layout Component', () => {
  // Mock user data for different roles
  const mockSuperAdmin = {
    auth: {
      isAuthenticated: true,
      token: 'valid-token',
      user: {
        username: 'admin',
        role: 'super_admin',
      },
    },
    logout: jest.fn(),
  };

  const mockManager = {
    auth: {
      isAuthenticated: true,
      token: 'valid-token',
      user: {
        username: 'manager',
        role: 'manager',
        group: 'Property A',
      },
    },
    logout: jest.fn(),
  };

  const mockStaff = {
    auth: {
      isAuthenticated: true,
      token: 'valid-token',
      user: {
        username: 'staff',
        role: 'staff',
      },
    },
    logout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to superAdmin for tests that don't specify
    useAuth.mockReturnValue(mockSuperAdmin);
  });

  test('renders Layout component for super_admin with all menu items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );

    // Check if admin panel title is displayed
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();

    // Check for base menu items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Requests')).toBeInTheDocument();

    // Check for manager menu items
    expect(screen.getByText('Rooms')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();

    // Check for admin menu items
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Email Settings')).toBeInTheDocument();

    // Check user info
    expect(screen.getByText('Logged in as: admin')).toBeInTheDocument();
    expect(screen.getByText('Role: super_admin')).toBeInTheDocument();

    // Check logout button
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  test('renders Layout component for manager with appropriate menu items', () => {
    useAuth.mockReturnValue(mockManager);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );

    // Check if manager panel title is displayed
    expect(screen.getByText('Manager Panel')).toBeInTheDocument();

    // Check for base menu items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Requests')).toBeInTheDocument();

    // Check for manager menu items
    expect(screen.getByText('Rooms')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();

    // Check admin menu items are not present
    expect(screen.queryByText('Properties')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Email Settings')).not.toBeInTheDocument();

    // Check user info
    expect(screen.getByText('Logged in as: manager')).toBeInTheDocument();
    expect(screen.getByText('Role: manager')).toBeInTheDocument();
    expect(screen.getByText('Group: Property A')).toBeInTheDocument();
  });

  test('renders Layout component for staff with limited menu items', () => {
    useAuth.mockReturnValue(mockStaff);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );

    // Check if user panel title is displayed
    expect(screen.getByText('User Panel')).toBeInTheDocument();

    // Check for base menu items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Requests')).toBeInTheDocument();

    // Check manager menu items are not present
    expect(screen.queryByText('Rooms')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();

    // Check admin menu items are not present
    expect(screen.queryByText('Properties')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Email Settings')).not.toBeInTheDocument();

    // Check user info
    expect(screen.getByText('Logged in as: staff')).toBeInTheDocument();
    expect(screen.getByText('Role: staff')).toBeInTheDocument();
  });

  test('navigates to correct route when menu item is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );

    // Click on the Tickets menu item
    fireEvent.click(screen.getByText('Tickets'));
    expect(mockNavigate).toHaveBeenCalledWith('/tickets');

    // Click on the Properties menu item (admin only)
    fireEvent.click(screen.getByText('Properties'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/properties');
  });

  test('logs out user when logout button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );

    // Click on the Logout button
    fireEvent.click(screen.getByText('Logout'));
    expect(mockSuperAdmin.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('renders null when user is not authenticated', () => {
    useAuth.mockReturnValue({
      auth: {
        isAuthenticated: false,
        token: null,
      },
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );

    // Check that the component renders nothing
    expect(container).toBeEmptyDOMElement();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('navigates to login when no auth token is present', () => {
    useAuth.mockReturnValue({
      auth: {
        isAuthenticated: true,
        token: null,
        user: {
          username: 'test',
          role: 'staff',
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
}); 