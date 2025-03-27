import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import '@testing-library/jest-dom';

// Mock the AuthContext hook
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock useLocation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn()
}));

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set a default location for all tests
    useLocation.mockReturnValue({ pathname: '/protected' });
  });

  // Test 1: When user is authenticated and has the correct role
  test('renders children when user is authenticated and has the required role', () => {
    useAuth.mockReturnValue({
      auth: {
        isAuthenticated: true,
        user: {
          role: 'admin'
        }
      }
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Unauthorized Page')).not.toBeInTheDocument();
  });

  // Test 2: When user is not authenticated
  test('redirects to login when user is not authenticated', () => {
    useAuth.mockReturnValue({
      auth: {
        isAuthenticated: false
      }
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  // Test 3: When user is authenticated but doesn't have the correct role
  test('redirects to unauthorized when user does not have the required role', () => {
    useAuth.mockReturnValue({
      auth: {
        isAuthenticated: true,
        user: {
          role: 'staff'
        }
      }
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
  });

  // Test 4: When route does not require auth but user is authenticated
  test('redirects to specified route when auth not required but user is authenticated', () => {
    useAuth.mockReturnValue({
      auth: {
        isAuthenticated: true
      }
    });

    render(
      <MemoryRouter initialEntries={['/public']}>
        <Routes>
          <Route
            path="/public"
            element={
              <ProtectedRoute requiresAuth={false} redirectTo="/dashboard">
                <div data-testid="public-content">Public Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('public-content')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  // Test 5: When route does not require auth and user is not authenticated
  test('renders children when auth not required and user is not authenticated', () => {
    useAuth.mockReturnValue({
      auth: {
        isAuthenticated: false
      }
    });

    render(
      <MemoryRouter initialEntries={['/public']}>
        <Routes>
          <Route
            path="/public"
            element={
              <ProtectedRoute requiresAuth={false}>
                <div data-testid="public-content">Public Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('public-content')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  // Test 6: When no allowed roles are specified (any role is allowed)
  test('renders children when no roles are specified and user is authenticated', () => {
    useAuth.mockReturnValue({
      auth: {
        isAuthenticated: true,
        user: {
          role: 'any-role'
        }
      }
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
}); 