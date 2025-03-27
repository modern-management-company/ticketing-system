import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import TicketList from './TicketList';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  getTickets: jest.fn(),
  updateTicketStatus: jest.fn(),
  assignTicket: jest.fn(),
  getUsers: jest.fn(),
  getProperties: jest.fn()
}));

import { 
  getTickets, 
  updateTicketStatus, 
  assignTicket,
  getUsers,
  getProperties
} from './apiClient';

// Mock tickets data
const mockTickets = [
  {
    ticket_id: 1,
    title: 'Broken AC',
    description: 'AC is not cooling properly',
    status: 'open',
    priority: 'high',
    category: 'maintenance',
    created_at: '2023-07-15T10:30:00.000Z',
    updated_at: '2023-07-15T10:30:00.000Z',
    property: {
      property_id: 1,
      name: 'Grand Hotel'
    },
    assigned_to: null,
    created_by: {
      user_id: 2,
      username: 'manager1'
    }
  },
  {
    ticket_id: 2,
    title: 'Leaky Faucet',
    description: 'Bathroom faucet is leaking',
    status: 'in_progress',
    priority: 'medium',
    category: 'plumbing',
    created_at: '2023-07-14T09:15:00.000Z',
    updated_at: '2023-07-14T14:20:00.000Z',
    property: {
      property_id: 2,
      name: 'Beachside Resort'
    },
    assigned_to: {
      user_id: 4,
      username: 'technician1'
    },
    created_by: {
      user_id: 3,
      username: 'manager2'
    }
  },
  {
    ticket_id: 3,
    title: 'Wi-Fi Issues',
    description: 'Wi-Fi not working in room 302',
    status: 'resolved',
    priority: 'medium',
    category: 'network',
    created_at: '2023-07-13T11:45:00.000Z',
    updated_at: '2023-07-13T16:30:00.000Z',
    property: {
      property_id: 1,
      name: 'Grand Hotel'
    },
    assigned_to: {
      user_id: 5,
      username: 'technician2'
    },
    created_by: {
      user_id: 2,
      username: 'manager1'
    }
  }
];

// Mock users data
const mockUsers = [
  {
    user_id: 1,
    username: 'admin',
    role: 'super_admin',
    email: 'admin@example.com'
  },
  {
    user_id: 2,
    username: 'manager1',
    role: 'manager',
    email: 'manager1@example.com'
  },
  {
    user_id: 3,
    username: 'manager2',
    role: 'manager',
    email: 'manager2@example.com'
  },
  {
    user_id: 4,
    username: 'technician1',
    role: 'technician',
    email: 'tech1@example.com'
  },
  {
    user_id: 5,
    username: 'technician2',
    role: 'technician',
    email: 'tech2@example.com'
  }
];

// Mock properties data
const mockProperties = [
  {
    property_id: 1,
    name: 'Grand Hotel',
    address: '123 Main St, City',
    type: 'hotel',
    status: 'active'
  },
  {
    property_id: 2,
    name: 'Beachside Resort',
    address: '456 Ocean Blvd, Beach City',
    type: 'resort',
    status: 'active'
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

// Mock property switcher
const mockSelectedProperty = { 
  property_id: 0, 
  name: 'All Properties' 
};

// Mock context hooks
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: () => mockAuthContext
}));

jest.mock('../hooks/usePropertySwitcher', () => ({
  __esModule: true,
  default: () => ({
    selectedProperty: mockSelectedProperty,
    setSelectedProperty: jest.fn()
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

describe('TicketList Component', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
    
    // Mock API responses
    getTickets.mockResolvedValue({ tickets: mockTickets });
    getUsers.mockResolvedValue({ users: mockUsers });
    getProperties.mockResolvedValue({ properties: mockProperties });
    updateTicketStatus.mockResolvedValue({ message: 'Ticket status updated successfully' });
    assignTicket.mockResolvedValue({ message: 'Ticket assigned successfully' });
    
    // Mock window.confirm to always return true
    window.confirm = jest.fn(() => true);
    
    // Mock navigation
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => jest.fn()
    }));
  });

  test('renders ticket list component', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Check if component title is displayed
    expect(screen.getByText(/tickets/i)).toBeInTheDocument();
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Check if tickets are displayed
    expect(screen.getByText(/broken ac/i)).toBeInTheDocument();
    expect(screen.getByText(/leaky faucet/i)).toBeInTheDocument();
    expect(screen.getByText(/wi-fi issues/i)).toBeInTheDocument();
  });

  test('can filter tickets by status', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click the status filter dropdown
    const statusFilter = screen.getByLabelText(/status/i);
    fireEvent.change(statusFilter, { target: { value: 'open' } });
    
    // Check if getTickets was called with the correct filter
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({
        status: 'open'
      }));
    });
  });

  test('can filter tickets by priority', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click the priority filter dropdown
    const priorityFilter = screen.getByLabelText(/priority/i);
    fireEvent.change(priorityFilter, { target: { value: 'high' } });
    
    // Check if getTickets was called with the correct filter
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({
        priority: 'high'
      }));
    });
  });

  test('can filter tickets by category', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click the category filter dropdown
    const categoryFilter = screen.getByLabelText(/category/i);
    fireEvent.change(categoryFilter, { target: { value: 'maintenance' } });
    
    // Check if getTickets was called with the correct filter
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({
        category: 'maintenance'
      }));
    });
  });

  test('can search tickets by title', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and type in the search field
    const searchField = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchField, { target: { value: 'AC' } });
    
    // Simulate search submission (could be triggered by debounce or enter key)
    // For testing, we'll trigger it directly
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({
        search: 'AC'
      }));
    });
  });

  test('can change ticket status', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click on the status button of the first ticket
    const statusCells = screen.getAllByText(/open|in_progress|resolved/i);
    fireEvent.click(statusCells[0]); // First ticket has 'open' status
    
    // In the status menu, select 'in_progress'
    const inProgressOption = screen.getByText(/in progress/i);
    fireEvent.click(inProgressOption);
    
    // Check if updateTicketStatus was called with the correct data
    await waitFor(() => {
      expect(updateTicketStatus).toHaveBeenCalledWith(1, { status: 'in_progress' });
    });
    
    // Check if tickets are refreshed after status update
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can open ticket assignment dialog', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click the assign button for the first ticket
    const assignButtons = screen.getAllByRole('button', { name: /assign/i });
    fireEvent.click(assignButtons[0]);
    
    // Check if the assignment dialog is open
    await waitFor(() => {
      expect(screen.getByText(/assign ticket/i)).toBeInTheDocument();
    });
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Check if technician list is displayed
    expect(screen.getByText(/technician1/i)).toBeInTheDocument();
    expect(screen.getByText(/technician2/i)).toBeInTheDocument();
  });

  test('can assign a ticket to a technician', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Open the assignment dialog for the first ticket
    const assignButtons = screen.getAllByRole('button', { name: /assign/i });
    fireEvent.click(assignButtons[0]);
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Select a technician from the dropdown
    const technicianSelect = screen.getByLabelText(/select technician/i);
    fireEvent.change(technicianSelect, { target: { value: '4' } }); // technician1
    
    // Click the assign button
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if assignTicket was called with the correct data
    await waitFor(() => {
      expect(assignTicket).toHaveBeenCalledWith({
        ticket_id: 1,
        assigned_to: '4'
      });
    });
    
    // Check if tickets are refreshed after assignment
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can sort tickets by different columns', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click the created date column header to sort
    const dateHeader = screen.getByText(/created/i);
    fireEvent.click(dateHeader);
    
    // Check if sorting parameters were passed to getTickets
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({
        sortBy: 'created_at',
        sortOrder: 'desc'
      }));
    });
    
    // Click again to change sort order
    fireEvent.click(dateHeader);
    
    // Check if sorting parameters were updated
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({
        sortBy: 'created_at',
        sortOrder: 'asc'
      }));
    });
  });

  test('can paginate through tickets', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click the next page button
    const nextPageButton = screen.getByLabelText(/next page/i);
    fireEvent.click(nextPageButton);
    
    // Check if pagination parameters were passed to getTickets
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({
        page: 2
      }));
    });
  });

  test('can change the number of tickets per page', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and change the rows per page dropdown
    const rowsPerPageSelect = screen.getByLabelText(/rows per page/i);
    fireEvent.change(rowsPerPageSelect, { target: { value: '25' } });
    
    // Check if rows per page parameter was passed to getTickets
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({
        limit: 25
      }));
    });
  });

  test('can view ticket details', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Find and click on the view details button for the first ticket
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);
    
    // Since this would usually navigate to a different page,
    // we're checking that the link has the correct path
    expect(viewButtons[0].closest('a')).toHaveAttribute('href', expect.stringContaining('/tickets/1'));
  });

  test('displays correct property name for each ticket', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Check if property names are displayed correctly
    const propertyNames = screen.getAllByText(/grand hotel|beachside resort/i);
    expect(propertyNames).toHaveLength(3); // Two for Grand Hotel, one for Beachside Resort
    
    // First ticket should be from Grand Hotel
    expect(propertyNames[0].textContent).toContain('Grand Hotel');
    // Second ticket should be from Beachside Resort
    expect(propertyNames[1].textContent).toContain('Beachside Resort');
  });

  test('displays assigned technician name when ticket is assigned', async () => {
    render(
      <TestWrapper>
        <TicketList />
      </TestWrapper>
    );
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(getTickets).toHaveBeenCalled();
    });
    
    // Check if assigned technicians are displayed correctly
    expect(screen.getByText(/technician1/i)).toBeInTheDocument(); // For the second ticket
    expect(screen.getByText(/technician2/i)).toBeInTheDocument(); // For the third ticket
    
    // First ticket should display "Unassigned"
    const unassignedElements = screen.getAllByText(/unassigned/i);
    expect(unassignedElements.length).toBeGreaterThan(0);
  });
});