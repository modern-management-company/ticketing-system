import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ViewRooms from './ViewRooms';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  getRooms: jest.fn(),
  getProperties: jest.fn(),
  createRoom: jest.fn(),
  updateRoom: jest.fn(),
  deleteRoom: jest.fn()
}));

import { 
  getRooms, 
  getProperties, 
  createRoom,
  updateRoom,
  deleteRoom
} from './apiClient';

// Mock rooms data
const mockRooms = [
  {
    room_id: 1,
    name: 'Room 101',
    property_id: 1,
    type: 'standard',
    floor: 1,
    status: 'available',
    capacity: 2,
    amenities: ['TV', 'WiFi', 'Minibar'],
    last_cleaned: '2023-03-15T10:30:00Z'
  },
  {
    room_id: 2,
    name: 'Room 102',
    property_id: 1,
    type: 'deluxe',
    floor: 1,
    status: 'occupied',
    capacity: 3,
    amenities: ['TV', 'WiFi', 'Minibar', 'Jacuzzi'],
    last_cleaned: '2023-03-16T14:20:00Z'
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

describe('ViewRooms Component', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
    
    // Mock API responses
    getRooms.mockResolvedValue({ rooms: mockRooms });
    getProperties.mockResolvedValue({ properties: mockProperties });
    createRoom.mockResolvedValue({ room_id: 3, message: 'Room created' });
    updateRoom.mockResolvedValue({ message: 'Room updated' });
    deleteRoom.mockResolvedValue({ message: 'Room deleted' });
  });

  test('renders rooms table', async () => {
    render(
      <TestWrapper>
        <ViewRooms />
      </TestWrapper>
    );
    
    // Wait for the rooms to load
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalled();
    });
    
    // Check if rooms are displayed
    expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    expect(screen.getByText(/Room 102/i)).toBeInTheDocument();
  });

  test('can filter rooms by status', async () => {
    render(
      <TestWrapper>
        <ViewRooms />
      </TestWrapper>
    );
    
    // Wait for the rooms to load
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalled();
    });
    
    // Find and click the status filter
    const statusFilter = screen.getByLabelText(/status/i);
    fireEvent.change(statusFilter, { target: { value: 'available' } });
    
    // Should call getRooms with the status filter
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalledWith(expect.objectContaining({ status: 'available' }));
    });
  });

  test('can search rooms by name', async () => {
    render(
      <TestWrapper>
        <ViewRooms />
      </TestWrapper>
    );
    
    // Wait for the rooms to load
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalled();
    });
    
    // Find and use the search box
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: '101' } });
    
    // Assuming there's a search button or auto-search functionality
    // For this test we'll assume typing triggers search after debounce
    await waitFor(() => {
      // The component should filter locally, not make a new API call
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
      expect(screen.queryByText(/Room 102/i)).not.toBeInTheDocument();
    });
  });

  test('can open create room dialog', async () => {
    render(
      <TestWrapper>
        <ViewRooms />
      </TestWrapper>
    );
    
    // Wait for the rooms to load
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalled();
    });
    
    // Find and click the create room button
    const createButton = screen.getByText(/add room/i);
    fireEvent.click(createButton);
    
    // Check if the dialog is displayed
    expect(screen.getByText(/create room/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
  });

  test('can create a new room', async () => {
    render(
      <TestWrapper>
        <ViewRooms />
      </TestWrapper>
    );
    
    // Wait for the rooms to load
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalled();
    });
    
    // Open create room dialog
    const createButton = screen.getByText(/add room/i);
    fireEvent.click(createButton);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/name/i), { 
      target: { value: 'Room 103' } 
    });
    
    // Select a property (assuming there's a select element for property)
    const propertySelect = screen.getByLabelText(/property/i);
    fireEvent.change(propertySelect, { target: { value: '1' } });
    
    // Select room type
    const typeSelect = screen.getByLabelText(/type/i);
    fireEvent.change(typeSelect, { target: { value: 'standard' } });
    
    // Set floor
    const floorInput = screen.getByLabelText(/floor/i);
    fireEvent.change(floorInput, { target: { value: '2' } });
    
    // Set capacity
    const capacityInput = screen.getByLabelText(/capacity/i);
    fireEvent.change(capacityInput, { target: { value: '2' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if createRoom was called with the correct data
    await waitFor(() => {
      expect(createRoom).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Room 103',
        property_id: '1',
        type: 'standard',
        floor: '2',
        capacity: '2'
      }));
    });
    
    // Check if rooms are refreshed after creation
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can view room details', async () => {
    render(
      <TestWrapper>
        <ViewRooms />
      </TestWrapper>
    );
    
    // Wait for the rooms to load
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalled();
    });
    
    // Find and click the view button for the first room
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);
    
    // Check if the details dialog is displayed with correct information
    await waitFor(() => {
      expect(screen.getByText(/room details/i)).toBeInTheDocument();
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
      expect(screen.getByText(/standard/i)).toBeInTheDocument();
      expect(screen.getByText(/available/i)).toBeInTheDocument();
    });
  });

  test('can update a room', async () => {
    render(
      <TestWrapper>
        <ViewRooms />
      </TestWrapper>
    );
    
    // Wait for the rooms to load
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalled();
    });
    
    // Find and click the edit button for the first room
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);
    
    // Wait for dialog to appear and then update status
    await waitFor(() => {
      expect(screen.getByText(/edit room/i)).toBeInTheDocument();
    });
    
    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: 'maintenance' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /update/i });
    fireEvent.click(submitButton);
    
    // Check if updateRoom was called with the correct data
    await waitFor(() => {
      expect(updateRoom).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'maintenance'
      }));
    });
  });

  test('can delete a room', async () => {
    render(
      <TestWrapper>
        <ViewRooms />
      </TestWrapper>
    );
    
    // Wait for the rooms to load
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalled();
    });
    
    // Find and click the delete button for the first room
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    
    // Confirm deletion in the confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    // Check if deleteRoom was called with the correct id
    await waitFor(() => {
      expect(deleteRoom).toHaveBeenCalledWith(1);
    });
    
    // Check if rooms are refreshed after deletion
    await waitFor(() => {
      expect(getRooms).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });
}); 