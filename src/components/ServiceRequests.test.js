import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ServiceRequests from './ServiceRequests';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  getServiceRequests: jest.fn(),
  getProperties: jest.fn(),
  getRooms: jest.fn(),
  createServiceRequest: jest.fn(),
  updateServiceRequest: jest.fn(),
  deleteServiceRequest: jest.fn(),
  completeServiceRequest: jest.fn()
}));

import { 
  getServiceRequests, 
  getProperties, 
  getRooms,
  createServiceRequest,
  updateServiceRequest,
  deleteServiceRequest,
  completeServiceRequest
} from './apiClient';

// Mock service requests data
const mockRequests = [
  {
    request_id: 1,
    room_id: 1,
    room_number: '101',
    property_id: 1,
    request_group: 'Housekeeping',
    request_type: 'Room Cleaning',
    priority: 'normal',
    status: 'pending',
    guest_name: 'John Doe',
    notes: 'Please clean ASAP',
    created_at: '2023-03-15T10:30:00Z',
    created_by_username: 'user1'
  },
  {
    request_id: 2,
    room_id: 2,
    room_number: '102',
    property_id: 1,
    request_group: 'Engineering',
    request_type: 'AC Repair',
    priority: 'high',
    status: 'in_progress',
    guest_name: 'Jane Smith',
    notes: 'AC not working properly',
    created_at: '2023-03-16T14:20:00Z',
    created_by_username: 'user2'
  }
];

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

// Mock rooms data
const mockRooms = [
  {
    room_id: 1,
    name: 'Room 101',
    property_id: 1,
    type: 'standard',
    floor: 1,
    status: 'occupied'
  },
  {
    room_id: 2,
    name: 'Room 102',
    property_id: 1,
    type: 'deluxe',
    floor: 1,
    status: 'occupied'
  }
];

// Mock context values
const mockAuthContext = {
  isAuthenticated: true,
  user: {
    user_id: 1,
    username: 'testuser',
    role: 'manager',
    group: 'Housekeeping',
    assigned_properties: [{ property_id: 1, name: 'Test Hotel' }]
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

describe('ServiceRequests Component', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
    
    // Mock API responses
    getServiceRequests.mockResolvedValue({ requests: mockRequests });
    getProperties.mockResolvedValue({ properties: mockProperties });
    getRooms.mockResolvedValue({ rooms: mockRooms });
    createServiceRequest.mockResolvedValue({ request_id: 3, message: 'Request created' });
    updateServiceRequest.mockResolvedValue({ message: 'Request updated' });
    deleteServiceRequest.mockResolvedValue({ message: 'Request deleted' });
    completeServiceRequest.mockResolvedValue({ message: 'Request completed' });
  });

  test('renders service requests table', async () => {
    render(
      <TestWrapper>
        <ServiceRequests />
      </TestWrapper>
    );
    
    // Wait for the requests to load
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalled();
    });
    
    // Check if requests are displayed
    expect(screen.getByText(/Room Cleaning/i)).toBeInTheDocument();
    expect(screen.getByText(/AC Repair/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
  });

  test('can filter requests by group', async () => {
    render(
      <TestWrapper>
        <ServiceRequests />
      </TestWrapper>
    );
    
    // Wait for the requests to load
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalled();
    });
    
    // Find and click the group filter
    const groupFilter = screen.getByLabelText(/group/i);
    fireEvent.change(groupFilter, { target: { value: 'Housekeeping' } });
    
    // Should call getServiceRequests with the group filter
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalledWith(expect.objectContaining({ 
        request_group: 'Housekeeping' 
      }));
    });
  });

  test('can filter requests by status', async () => {
    render(
      <TestWrapper>
        <ServiceRequests />
      </TestWrapper>
    );
    
    // Wait for the requests to load
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalled();
    });
    
    // Find and click the status filter
    const statusFilter = screen.getByLabelText(/status/i);
    fireEvent.change(statusFilter, { target: { value: 'pending' } });
    
    // Should call getServiceRequests with the status filter
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalledWith(expect.objectContaining({ 
        status: 'pending' 
      }));
    });
  });

  test('can open create request dialog', async () => {
    render(
      <TestWrapper>
        <ServiceRequests />
      </TestWrapper>
    );
    
    // Wait for the requests to load
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalled();
    });
    
    // Find and click the create request button
    const createButton = screen.getByText(/new request/i);
    fireEvent.click(createButton);
    
    // Check if the dialog is displayed
    await waitFor(() => {
      expect(screen.getByText(/create service request/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/request type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  test('can create a new service request', async () => {
    render(
      <TestWrapper>
        <ServiceRequests />
      </TestWrapper>
    );
    
    // Wait for the requests to load
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalled();
    });
    
    // Open create request dialog
    const createButton = screen.getByText(/new request/i);
    fireEvent.click(createButton);
    
    // Wait for dialog and then fill out the form
    await waitFor(() => {
      expect(screen.getByText(/create service request/i)).toBeInTheDocument();
    });
    
    // Select request group (assuming the user's group is pre-selected)
    
    // Select request type
    const typeSelect = screen.getByLabelText(/request type/i);
    fireEvent.change(typeSelect, { target: { value: 'Turndown Service' } });
    
    // Select a property (assuming there's a select element for property)
    const propertySelect = screen.getByLabelText(/property/i);
    fireEvent.change(propertySelect, { target: { value: '1' } });
    
    // Select a room
    const roomSelect = screen.getByLabelText(/room/i);
    fireEvent.change(roomSelect, { target: { value: '1' } });
    
    // Select priority
    const prioritySelect = screen.getByLabelText(/priority/i);
    fireEvent.change(prioritySelect, { target: { value: 'normal' } });
    
    // Add guest name
    const guestInput = screen.getByLabelText(/guest name/i);
    fireEvent.change(guestInput, { target: { value: 'Test Guest' } });
    
    // Add notes
    const notesInput = screen.getByLabelText(/notes/i);
    fireEvent.change(notesInput, { target: { value: 'Test notes for service request' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if createServiceRequest was called with the correct data
    await waitFor(() => {
      expect(createServiceRequest).toHaveBeenCalledWith(expect.objectContaining({
        request_group: 'Housekeeping', // User's group
        request_type: 'Turndown Service',
        property_id: '1',
        room_id: '1',
        priority: 'normal',
        guest_name: 'Test Guest',
        notes: 'Test notes for service request'
      }));
    });
    
    // Check if requests are refreshed after creation
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can view request details', async () => {
    render(
      <TestWrapper>
        <ServiceRequests />
      </TestWrapper>
    );
    
    // Wait for the requests to load
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalled();
    });
    
    // Find and click the view button for the first request
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);
    
    // Check if the details dialog is displayed with correct information
    await waitFor(() => {
      expect(screen.getByText(/request details/i)).toBeInTheDocument();
      expect(screen.getByText(/Room Cleaning/i)).toBeInTheDocument();
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Please clean ASAP/i)).toBeInTheDocument();
    });
  });

  test('can update a service request', async () => {
    render(
      <TestWrapper>
        <ServiceRequests />
      </TestWrapper>
    );
    
    // Wait for the requests to load
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalled();
    });
    
    // Find and click the edit button for the first request
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);
    
    // Wait for dialog to appear and then update status
    await waitFor(() => {
      expect(screen.getByText(/edit request/i)).toBeInTheDocument();
    });
    
    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: 'in_progress' } });
    
    // Update priority
    const prioritySelect = screen.getByLabelText(/priority/i);
    fireEvent.change(prioritySelect, { target: { value: 'high' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /update/i });
    fireEvent.click(submitButton);
    
    // Check if updateServiceRequest was called with the correct data
    await waitFor(() => {
      expect(updateServiceRequest).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'in_progress',
        priority: 'high'
      }));
    });
  });

  test('can complete a service request', async () => {
    render(
      <TestWrapper>
        <ServiceRequests />
      </TestWrapper>
    );
    
    // Wait for the requests to load
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalled();
    });
    
    // Find and click the complete button for the first request
    const completeButtons = screen.getAllByRole('button', { name: /complete/i });
    fireEvent.click(completeButtons[0]);
    
    // Confirm completion in the confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm completion/i)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    // Check if completeServiceRequest was called with the correct id
    await waitFor(() => {
      expect(completeServiceRequest).toHaveBeenCalledWith(1);
    });
    
    // Check if requests are refreshed after completion
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can delete a service request', async () => {
    render(
      <TestWrapper>
        <ServiceRequests />
      </TestWrapper>
    );
    
    // Wait for the requests to load
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalled();
    });
    
    // Find and click the delete button for the first request
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    
    // Confirm deletion in the confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    // Check if deleteServiceRequest was called with the correct id
    await waitFor(() => {
      expect(deleteServiceRequest).toHaveBeenCalledWith(1);
    });
    
    // Check if requests are refreshed after deletion
    await waitFor(() => {
      expect(getServiceRequests).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });
}); 