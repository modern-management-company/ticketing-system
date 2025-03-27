import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import HomeOverview from './HomeOverview';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  get: jest.fn()
}));

import apiClient from './apiClient';

// Mock navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock dashboard data
const mockDashboardData = {
  recentTickets: [
    {
      ticket_id: 1,
      title: 'Broken AC',
      status: 'open',
      priority: 'high',
      created_at: '2023-07-15T10:30:00Z'
    },
    {
      ticket_id: 2,
      title: 'Leaky Faucet',
      status: 'in progress',
      priority: 'medium',
      created_at: '2023-07-14T09:15:00Z'
    }
  ],
  recentTasks: [
    {
      task_id: 1,
      title: 'Fix AC in Room 101',
      status: 'pending',
      priority: 'High',
      due_date: '2023-07-20T14:00:00Z'
    },
    {
      task_id: 2,
      title: 'Clean Room 102',
      status: 'in progress',
      priority: 'Medium',
      due_date: null
    }
  ],
  openTickets: 5,
  activeTasks: 8,
  openRequests: 3,
  totalTasks: 15,
  resolutionRate: 75,
  totalProperties: 3,
  totalUsers: 10,
  totalRooms: 25,
  ticketDistribution: [
    { name: 'Maintenance', value: 15 },
    { name: 'Housekeeping', value: 8 },
    { name: 'IT', value: 5 }
  ],
  priorityDistribution: [
    { name: 'High', value: 10 },
    { name: 'Medium', value: 12 },
    { name: 'Low', value: 6 }
  ]
};

// Mock context values for different user roles
const mockAdminContext = {
  auth: {
    user: {
      user_id: 1,
      username: 'admin',
      role: 'super_admin'
    }
  }
};

const mockManagerContext = {
  auth: {
    user: {
      user_id: 2,
      username: 'manager',
      role: 'manager'
    }
  }
};

const mockStaffContext = {
  auth: {
    user: {
      user_id: 3,
      username: 'staff',
      role: 'staff'
    }
  }
};

// Setup auth mock
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: jest.fn()
}));

import { useAuth } from '../context/AuthContext';

describe('HomeOverview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API response
    apiClient.get.mockResolvedValue({ data: mockDashboardData });
  });

  test('renders loading state', async () => {
    // Set auth context for this test
    useAuth.mockReturnValue(mockAdminContext);
    
    render(
      <BrowserRouter>
        <HomeOverview />
      </BrowserRouter>
    );
    
    // Check if loading indicator is displayed initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders error state when API fails', async () => {
    // Mock API error
    apiClient.get.mockRejectedValueOnce(new Error('Failed to load data'));
    useAuth.mockReturnValue(mockAdminContext);
    
    render(
      <BrowserRouter>
        <HomeOverview />
      </BrowserRouter>
    );
    
    // Wait for error to display
    await waitFor(() => {
      expect(screen.getByText('Failed to load overview data')).toBeInTheDocument();
    });
  });

  test('renders admin dashboard correctly', async () => {
    useAuth.mockReturnValue(mockAdminContext);
    
    render(
      <BrowserRouter>
        <HomeOverview />
      </BrowserRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats');
    });
    
    // Check admin-specific content
    expect(screen.getByText('System Administrator Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, admin!')).toBeInTheDocument();
    expect(screen.getByText('Manage your entire property management system')).toBeInTheDocument();
    
    // Check admin-specific stats
    expect(screen.getByText('Total Properties')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // Total users count
    
    // Check admin-specific actions
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
    expect(screen.getByText('Manage Properties')).toBeInTheDocument();
  });

  test('renders manager dashboard correctly', async () => {
    useAuth.mockReturnValue(mockManagerContext);
    
    render(
      <BrowserRouter>
        <HomeOverview />
      </BrowserRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats');
    });
    
    // Check manager-specific content
    expect(screen.getByText('Property Manager Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, manager!')).toBeInTheDocument();
    expect(screen.getByText('Track maintenance tasks, handle tickets, and manage room status.')).toBeInTheDocument();
    
    // Check manager-specific stats and actions
    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('Manage Rooms')).toBeInTheDocument();
  });

  test('renders staff dashboard correctly', async () => {
    useAuth.mockReturnValue(mockStaffContext);
    
    render(
      <BrowserRouter>
        <HomeOverview />
      </BrowserRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats');
    });
    
    // Check staff-specific content
    expect(screen.getByText('User Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, staff!')).toBeInTheDocument();
    expect(screen.getByText('View and manage your assigned work items.')).toBeInTheDocument();
    
    // Check staff-specific stats
    expect(screen.getByText('Resolution Rate')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    
    // Staff shouldn't see admin/manager specific actions
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage Properties')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage Rooms')).not.toBeInTheDocument();
  });

  test('displays correct stats from API data', async () => {
    useAuth.mockReturnValue(mockAdminContext);
    
    render(
      <BrowserRouter>
        <HomeOverview />
      </BrowserRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats');
    });
    
    // Check if stats from API are displayed correctly
    expect(screen.getByText('5')).toBeInTheDocument(); // openTickets
    expect(screen.getByText('8')).toBeInTheDocument(); // activeTasks
    expect(screen.getByText('3')).toBeInTheDocument(); // openRequests
    expect(screen.getByText('3')).toBeInTheDocument(); // totalProperties
    expect(screen.getByText('25')).toBeInTheDocument(); // totalRooms
  });

  test('navigates correctly when clicking on stat cards', async () => {
    useAuth.mockReturnValue(mockAdminContext);
    
    render(
      <BrowserRouter>
        <HomeOverview />
      </BrowserRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats');
    });
    
    // Find and click on Open Tickets stat card
    const openTicketsCard = screen.getByText('Open Tickets').closest('.MuiCard-root');
    fireEvent.click(openTicketsCard);
    
    // Check if navigation was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/tickets');
    
    // Reset mock
    mockNavigate.mockClear();
    
    // Find and click on Total Properties stat card
    const propertiesCard = screen.getByText('Total Properties').closest('.MuiCard-root');
    fireEvent.click(propertiesCard);
    
    // Check if navigation was called with correct path for admin
    expect(mockNavigate).toHaveBeenCalledWith('/admin/properties');
  });

  test('navigates correctly when clicking on action buttons', async () => {
    useAuth.mockReturnValue(mockManagerContext);
    
    render(
      <BrowserRouter>
        <HomeOverview />
      </BrowserRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats');
    });
    
    // Find and click Create Ticket button
    const createTicketButton = screen.getByText('Create Ticket');
    fireEvent.click(createTicketButton);
    
    // Check if navigation was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/tickets');
    
    // Reset mock
    mockNavigate.mockClear();
    
    // Find and click Manage Rooms button (manager-specific)
    const manageRoomsButton = screen.getByText('Manage Rooms');
    fireEvent.click(manageRoomsButton);
    
    // Check if navigation was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/rooms');
  });
}); 