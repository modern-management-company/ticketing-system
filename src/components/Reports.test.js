import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Reports from './Reports';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

import apiClient from './apiClient';

// Mock PropertySwitcher component
jest.mock('./PropertySwitcher', () => ({
  __esModule: true,
  default: ({ onPropertyChange }) => (
    <select 
      data-testid="property-switcher" 
      onChange={(e) => onPropertyChange(e.target.value)}
    >
      <option value="1">Property 1</option>
      <option value="2">Property 2</option>
    </select>
  )
}));

// Mock jsPDF and toast
jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    text: jest.fn(),
    setFontSize: jest.fn(),
    autoTable: jest.fn(),
    save: jest.fn()
  }))
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

// Mock properties data
const mockProperties = [
  {
    property_id: 1,
    name: 'Test Hotel',
    address: '123 Test St',
    type: 'hotel',
    status: 'active'
  },
  {
    property_id: 2,
    name: 'Test Resort',
    address: '456 Resort Blvd',
    type: 'resort',
    status: 'active'
  }
];

// Mock rooms data
const mockRooms = [
  {
    room_id: 101,
    name: 'Room 101',
    property_id: 1,
    status: 'occupied'
  },
  {
    room_id: 102,
    name: 'Room 102',
    property_id: 1,
    status: 'available'
  }
];

// Mock tickets data
const mockTickets = [
  {
    ticket_id: 1,
    title: 'AC not working',
    description: 'The AC in room 101 is not cooling properly',
    status: 'open',
    priority: 'high',
    room_name: 'Room 101',
    created_by_username: 'user1',
    created_at: '2023-08-15T10:30:00.000Z'
  },
  {
    ticket_id: 2,
    title: 'TV needs repair',
    description: 'TV in room 102 has no signal',
    status: 'in_progress',
    priority: 'medium',
    room_name: 'Room 102',
    created_by_username: 'user2',
    created_at: '2023-08-16T09:15:00.000Z'
  },
  {
    ticket_id: 3,
    title: 'Leaky faucet',
    description: 'Bathroom faucet in room 101 is leaking',
    status: 'completed',
    priority: 'low',
    room_name: 'Room 101',
    created_by_username: 'user1',
    created_at: '2023-08-14T14:45:00.000Z'
  }
];

// Mock tasks data
const mockTasks = [
  {
    task_id: 1,
    title: 'Fix AC in Room 101',
    description: 'Repair the AC unit',
    status: 'pending',
    priority: 'High',
    assigned_to: 'technician1',
    due_date: '2023-08-20T14:00:00.000Z',
    ticket_id: 1,
    room_info: {
      room_name: 'Room 101'
    }
  },
  {
    task_id: 2,
    title: 'Clean Room 102',
    description: 'Standard cleaning',
    status: 'in progress',
    priority: 'Medium',
    assigned_to: 'housekeeper1',
    due_date: null,
    ticket_id: null,
    room_info: {
      room_name: 'Room 102'
    }
  },
  {
    task_id: 3,
    title: 'Check TV signal',
    description: 'Diagnose TV signal issues',
    status: 'completed',
    priority: 'Medium',
    assigned_to: 'technician2',
    due_date: '2023-08-17T10:00:00.000Z',
    ticket_id: 2,
    room_info: {
      room_name: 'Room 102'
    }
  }
];

// Mock service requests data
const mockRequests = [
  {
    request_id: 1,
    request_type: 'Room Cleaning',
    room_number: '101',
    request_group: 'Housekeeping',
    status: 'pending',
    priority: 'normal',
    guest_name: 'John Doe',
    created_at: '2023-08-15T09:00:00.000Z'
  },
  {
    request_id: 2,
    request_type: 'AC Repair',
    room_number: '101',
    request_group: 'Engineering',
    status: 'in_progress',
    priority: 'high',
    guest_name: 'John Doe',
    created_at: '2023-08-15T10:30:00.000Z'
  },
  {
    request_id: 3,
    request_type: 'Additional Towels',
    room_number: '102',
    request_group: 'Housekeeping',
    status: 'completed',
    priority: 'low',
    guest_name: 'Jane Smith',
    created_at: '2023-08-16T11:15:00.000Z'
  }
];

// Mock auth context
const mockAuthContext = {
  auth: {
    user: {
      user_id: 1,
      username: 'testuser',
      role: 'manager',
      assigned_properties: [{ property_id: 1, name: 'Test Hotel' }]
    }
  }
};

// Mock context hook
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: () => mockAuthContext
}));

// Wrapper component with providers
const TestWrapper = ({ children }) => {
  return (
    <AuthProvider>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </AuthProvider>
  );
};

describe('Reports Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/properties') && !url.includes('/properties/')) {
        return Promise.resolve({ data: mockProperties });
      } else if (url.includes('/rooms')) {
        return Promise.resolve({ data: { rooms: mockRooms } });
      } else if (url.includes('/tickets')) {
        return Promise.resolve({ data: { tickets: mockTickets } });
      } else if (url.includes('/tasks')) {
        return Promise.resolve({ data: { tasks: mockTasks } });
      } else if (url.includes('/service-requests')) {
        return Promise.resolve({ data: { requests: mockRequests } });
      }
      return Promise.resolve({ data: {} });
    });
    
    apiClient.post.mockResolvedValue({
      data: { success: true, message: 'Report sent successfully' }
    });
  });

  test('renders reports component', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Check if component title is displayed
    expect(screen.getByText(/reports/i)).toBeInTheDocument();
    
    // Check if property switcher is displayed
    expect(screen.getByTestId('property-switcher')).toBeInTheDocument();
    
    // Check if tabs are displayed
    expect(screen.getByText(/tickets report/i)).toBeInTheDocument();
    expect(screen.getByText(/tasks report/i)).toBeInTheDocument();
    expect(screen.getByText(/service requests report/i)).toBeInTheDocument();
  });

  test('loads properties on mount', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/properties');
    });
  });

  test('loads rooms when property is selected', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Select a property
    const propertySwitcher = screen.getByTestId('property-switcher');
    fireEvent.change(propertySwitcher, { target: { value: '1' } });
    
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/properties/1/rooms');
    });
  });

  test('loads report data when property and date are selected', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Select a property
    const propertySwitcher = screen.getByTestId('property-switcher');
    fireEvent.change(propertySwitcher, { target: { value: '1' } });
    
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/\/properties\/1\/tickets/));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/\/service-requests/));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/\/properties\/1\/tasks/));
    });
  });

  test('displays tickets in the first tab', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Select a property to load data
    const propertySwitcher = screen.getByTestId('property-switcher');
    fireEvent.change(propertySwitcher, { target: { value: '1' } });
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/\/properties\/1\/tickets/));
    });
    
    // The tickets tab should be active by default
    await waitFor(() => {
      // Should only show non-completed tickets by default (hideCompleted is true)
      expect(screen.getByText('AC not working')).toBeInTheDocument();
      expect(screen.getByText('TV needs repair')).toBeInTheDocument();
      expect(screen.queryByText('Leaky faucet')).not.toBeInTheDocument(); // This is completed
    });
    
    // Check the stats
    expect(screen.getByText('Active Tickets: 2')).toBeInTheDocument();
  });

  test('can switch between tabs', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Select a property to load data
    const propertySwitcher = screen.getByTestId('property-switcher');
    fireEvent.change(propertySwitcher, { target: { value: '1' } });
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/\/properties\/1\/tickets/));
    });
    
    // Switch to tasks tab
    const tasksTab = screen.getByText('Tasks Report');
    fireEvent.click(tasksTab);
    
    // Check if tasks are displayed
    await waitFor(() => {
      expect(screen.getByText('Fix AC in Room 101')).toBeInTheDocument();
      expect(screen.getByText('Clean Room 102')).toBeInTheDocument();
      expect(screen.queryByText('Check TV signal')).not.toBeInTheDocument(); // This is completed
    });
    
    // Switch to service requests tab
    const requestsTab = screen.getByText('Service Requests Report');
    fireEvent.click(requestsTab);
    
    // Check if service requests are displayed
    await waitFor(() => {
      expect(screen.getByText('Room Cleaning')).toBeInTheDocument();
      expect(screen.getByText('AC Repair')).toBeInTheDocument();
      expect(screen.queryByText('Additional Towels')).not.toBeInTheDocument(); // This is completed
    });
  });

  test('can toggle hide completed items', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Select a property to load data
    const propertySwitcher = screen.getByTestId('property-switcher');
    fireEvent.change(propertySwitcher, { target: { value: '1' } });
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/\/properties\/1\/tickets/));
    });
    
    // Verify that completed items are hidden by default
    expect(screen.queryByText('Leaky faucet')).not.toBeInTheDocument();
    
    // Toggle the hide completed switch
    const hideCompletedSwitch = screen.getByLabelText(/hide completed items/i);
    fireEvent.click(hideCompletedSwitch);
    
    // Now completed items should be visible
    await waitFor(() => {
      expect(screen.getByText('Leaky faucet')).toBeInTheDocument();
    });
  });

  test('can filter by room', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Select a property to load data
    const propertySwitcher = screen.getByTestId('property-switcher');
    fireEvent.change(propertySwitcher, { target: { value: '1' } });
    
    // Wait for rooms to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/properties/1/rooms');
    });
    
    // Select a room filter
    const roomFilter = screen.getByLabelText(/filter by room/i);
    fireEvent.change(roomFilter, { target: { value: '101' } });
    
    // Verify that only items for Room 101 are shown
    await waitFor(() => {
      expect(screen.getByText('AC not working')).toBeInTheDocument(); // Room 101
      expect(screen.queryByText('TV needs repair')).not.toBeInTheDocument(); // Room 102
    });
    
    // Check the active filter chip
    expect(screen.getByText('Room: Room 101')).toBeInTheDocument();
  });

  test('can generate PDF report', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Select a property to load data
    const propertySwitcher = screen.getByTestId('property-switcher');
    fireEvent.change(propertySwitcher, { target: { value: '1' } });
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/\/properties\/1\/tickets/));
    });
    
    // Click the Generate PDF button
    const generatePdfButton = screen.getAllByText('Generate PDF')[0]; // First tab (tickets)
    fireEvent.click(generatePdfButton);
    
    // Verify that jsPDF was called
    const jsPDF = require('jspdf').default;
    expect(jsPDF).toHaveBeenCalled();
    expect(jsPDF().save).toHaveBeenCalled();
  });

  test('can send report via email', async () => {
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Select a property to load data
    const propertySwitcher = screen.getByTestId('property-switcher');
    fireEvent.change(propertySwitcher, { target: { value: '1' } });
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/\/properties\/1\/tickets/));
    });
    
    // Click the Send to Email button
    const sendEmailButton = screen.getAllByText('Send to Email')[0]; // First tab (tickets)
    fireEvent.click(sendEmailButton);
    
    // Verify that the API was called
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/reports/send-email',
        expect.objectContaining({
          property_id: '1',
          type: 'tickets'
        })
      );
    });
    
    // Verify toast was shown
    const toast = require('react-hot-toast');
    expect(toast.success).toHaveBeenCalled();
  });

  test('shows error message on API failure', async () => {
    // Mock API error
    apiClient.get.mockRejectedValueOnce({
      response: { data: { message: 'Failed to load properties' } }
    });
    
    render(
      <TestWrapper>
        <Reports />
      </TestWrapper>
    );
    
    // Check if error is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to load properties')).toBeInTheDocument();
    });
  });
}); 