import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ViewTickets from './ViewTickets';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  getTickets: jest.fn(),
  getProperties: jest.fn(),
  getRooms: jest.fn(),
  createTicket: jest.fn(),
  updateTicket: jest.fn(),
  deleteTicket: jest.fn()
}));

import { 
  getTickets, 
  getProperties, 
  getRooms,
  createTicket,
  updateTicket,
  deleteTicket
} from './apiClient';

// Mock tickets data
const mockTickets = [
  {
    ticket_id: 1,
    title: 'Broken AC',
    description: 'AC not working in room 101',
    status: 'open',
    priority: 'high',
    category: 'maintenance',
    subcategory: 'HVAC',
    created_by_username: 'user1',
    created_at: '2023-03-15T10:30:00Z',
    property_id: 1,
    room_id: 1,
    room_name: 'Room 101'
  },
  {
    ticket_id: 2,
    title: 'Leaking Faucet',
    description: 'Bathroom faucet leaking',
    status: 'in_progress',
    priority: 'medium',
    category: 'maintenance',
    subcategory: 'plumbing',
    created_by_username: 'user2',
    created_at: '2023-03-16T14:20:00Z',
    property_id: 1,
    room_id: 2,
    room_name: 'Room 102'
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

describe('ViewTickets Component', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
    
    // Mock API responses
    getTickets.mockResolvedValue({ tickets: mockTickets });
    getProperties.mockResolvedValue({ properties: mockProperties });
    getRooms.mockResolvedValue({ rooms: mockRooms });
    createTicket.mockResolvedValue({ ticket_id: 3, message: 'Ticket created' });
    updateTicket.mockResolvedValue({ message: 'Ticket updated' });
    deleteTicket.mockResolvedValue({ message: 'Ticket deleted' });
  });

  test('renders tickets table', async () => {
    render(
      <TestWrapper>
        <ViewTickets />
      </TestWrapper>
    );
    
    // Wait for the tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Check if tickets are displayed
    expect(screen.getByText(/broken ac/i)).toBeInTheDocument();
    expect(screen.getByText(/leaking faucet/i)).toBeInTheDocument();
  });

  test('can filter tickets by status', async () => {
    render(
      <TestWrapper>
        <ViewTickets />
      </TestWrapper>
    );
    
    // Wait for the tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click the status filter
    const statusFilter = screen.getByLabelText(/status/i);
    fireEvent.change(statusFilter, { target: { value: 'open' } });
    
    // Should call getTickets with the status filter
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({ status: 'open' }));
    });
  });

  test('can search tickets by title', async () => {
    render(
      <TestWrapper>
        <ViewTickets />
      </TestWrapper>
    );
    
    // Wait for the tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and use the search box
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'broken' } });
    
    // Assuming there's a search button or auto-search functionality
    // For this test we'll assume typing triggers search after debounce
    await waitFor(() => {
      // The component should filter locally, not make a new API call
      expect(screen.getByText(/broken ac/i)).toBeInTheDocument();
      expect(screen.queryByText(/leaking faucet/i)).not.toBeInTheDocument();
    });
  });

  test('can open create ticket dialog', async () => {
    render(
      <TestWrapper>
        <ViewTickets />
      </TestWrapper>
    );
    
    // Wait for the tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click the create ticket button
    const createButton = screen.getByText(/new ticket/i);
    fireEvent.click(createButton);
    
    // Check if the dialog is displayed
    expect(screen.getByText(/create ticket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  test('can create a new ticket', async () => {
    render(
      <TestWrapper>
        <ViewTickets />
      </TestWrapper>
    );
    
    // Wait for the tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Open create ticket dialog
    const createButton = screen.getByText(/new ticket/i);
    fireEvent.click(createButton);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/title/i), { 
      target: { value: 'New Test Ticket' } 
    });
    fireEvent.change(screen.getByLabelText(/description/i), { 
      target: { value: 'This is a test ticket description' } 
    });
    
    // Select a property (assuming there's a select element for property)
    const propertySelect = screen.getByLabelText(/property/i);
    fireEvent.change(propertySelect, { target: { value: '1' } });
    
    // Select priority and category
    const prioritySelect = screen.getByLabelText(/priority/i);
    fireEvent.change(prioritySelect, { target: { value: 'high' } });
    
    const categorySelect = screen.getByLabelText(/category/i);
    fireEvent.change(categorySelect, { target: { value: 'maintenance' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if createTicket was called with the correct data
    await waitFor(() => {
      expect(createTicket).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Test Ticket',
        description: 'This is a test ticket description',
        priority: 'high',
        category: 'maintenance',
        property_id: '1'
      }));
    });
    
    // Check if tickets are refreshed after creation
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can view ticket details', async () => {
    render(
      <TestWrapper>
        <ViewTickets />
      </TestWrapper>
    );
    
    // Wait for the tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click the view button for the first ticket
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);
    
    // Check if the details dialog is displayed with correct information
    await waitFor(() => {
      expect(screen.getByText(/ticket details/i)).toBeInTheDocument();
      expect(screen.getByText(/broken ac/i)).toBeInTheDocument();
      expect(screen.getByText(/ac not working in room 101/i)).toBeInTheDocument();
      expect(screen.getByText(/high/i)).toBeInTheDocument();
      expect(screen.getByText(/maintenance/i)).toBeInTheDocument();
    });
  });
}); 