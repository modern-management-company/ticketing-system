import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Dashboard from './Dashboard';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  getDashboardStats: jest.fn(),
  getProperties: jest.fn()
}));

import { getDashboardStats, getProperties } from './apiClient';

// Mock dashboard stats data
const mockDashboardStats = {
  tickets: {
    total: 25,
    open: 10,
    in_progress: 8,
    closed: 7,
    by_priority: {
      high: 8,
      medium: 12,
      low: 5
    },
    by_category: {
      maintenance: 15,
      housekeeping: 5,
      other: 5
    }
  },
  tasks: {
    total: 18,
    pending: 5,
    in_progress: 8,
    completed: 5,
    by_priority: {
      high: 6,
      medium: 9,
      low: 3
    }
  },
  service_requests: {
    total: 30,
    pending: 12,
    in_progress: 10,
    completed: 8,
    by_group: {
      Housekeeping: 15,
      Engineering: 10,
      'Front Desk': 5
    }
  },
  recent_activities: [
    {
      type: 'ticket',
      id: 1,
      title: 'Broken AC',
      status: 'open',
      created_at: '2023-03-25T14:30:00Z'
    },
    {
      type: 'task',
      id: 2,
      title: 'Fix Leaking Faucet',
      status: 'in_progress',
      created_at: '2023-03-25T13:45:00Z'
    },
    {
      type: 'service_request',
      id: 3,
      title: 'Room Cleaning',
      status: 'completed',
      created_at: '2023-03-25T12:15:00Z'
    }
  ]
};

// Mock properties data
const mockProperties = [
  {
    property_id: 1,
    name: 'Test Hotel',
    address: '123 Test St',
    type: 'hotel',
    status: 'active'
  }
];

// Mock context values
const mockAuthContext = {
  isAuthenticated: true,
  user: {
    user_id: 1,
    username: 'testuser',
    role: 'manager',
    assigned_properties: [{ property_id: 1, name: 'Test Hotel' }]
  },
  logout: jest.fn()
};

// Mock context hook
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: () => mockAuthContext
}));

// Mock property switcher hook
jest.mock('../hooks/usePropertySwitcher', () => ({
  usePropertySwitcher: () => ({
    currentProperty: { property_id: 1, name: 'Test Hotel' },
    availableProperties: [{ property_id: 1, name: 'Test Hotel' }],
    switchProperty: jest.fn()
  })
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

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
    
    // Mock API responses
    getDashboardStats.mockResolvedValue(mockDashboardStats);
    getProperties.mockResolvedValue({ properties: mockProperties });
  });

  test('renders dashboard heading', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Check if dashboard title is displayed
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  test('loads and displays dashboard statistics', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Wait for the dashboard stats to load
    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalled();
    });
    
    // Check if ticket stats are displayed
    expect(screen.getByText(/total tickets/i)).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument(); // Total tickets count
    
    // Check if task stats are displayed
    expect(screen.getByText(/total tasks/i)).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument(); // Total tasks count
    
    // Check if service request stats are displayed
    expect(screen.getByText(/total service requests/i)).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument(); // Total service requests count
  });

  test('displays recent activities', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Wait for the dashboard stats to load
    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalled();
    });
    
    // Check if recent activities are displayed
    expect(screen.getByText(/recent activities/i)).toBeInTheDocument();
    expect(screen.getByText(/broken ac/i)).toBeInTheDocument();
    expect(screen.getByText(/fix leaking faucet/i)).toBeInTheDocument();
    expect(screen.getByText(/room cleaning/i)).toBeInTheDocument();
  });

  test('displays ticket priority distribution', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Wait for the dashboard stats to load
    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalled();
    });
    
    // Check if ticket priority distribution is displayed
    expect(screen.getByText(/tickets by priority/i)).toBeInTheDocument();
    expect(screen.getByText(/high: 8/i)).toBeInTheDocument();
    expect(screen.getByText(/medium: 12/i)).toBeInTheDocument();
    expect(screen.getByText(/low: 5/i)).toBeInTheDocument();
  });

  test('displays ticket category distribution', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Wait for the dashboard stats to load
    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalled();
    });
    
    // Check if ticket category distribution is displayed
    expect(screen.getByText(/tickets by category/i)).toBeInTheDocument();
    expect(screen.getByText(/maintenance: 15/i)).toBeInTheDocument();
    expect(screen.getByText(/housekeeping: 5/i)).toBeInTheDocument();
    expect(screen.getByText(/other: 5/i)).toBeInTheDocument();
  });

  test('displays service request group distribution', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Wait for the dashboard stats to load
    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalled();
    });
    
    // Check if service request group distribution is displayed
    expect(screen.getByText(/service requests by group/i)).toBeInTheDocument();
    expect(screen.getByText(/housekeeping: 15/i)).toBeInTheDocument();
    expect(screen.getByText(/engineering: 10/i)).toBeInTheDocument();
    expect(screen.getByText(/front desk: 5/i)).toBeInTheDocument();
  });

  test('loads dashboard stats for specific property', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Wait for the dashboard stats to load
    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalledWith({ property_id: 1 });
    });
  });
}); 