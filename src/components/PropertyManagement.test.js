import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import PropertyManagement from './PropertyManagement';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  getProperties: jest.fn(),
  createProperty: jest.fn(),
  updateProperty: jest.fn(),
  deleteProperty: jest.fn(),
  getUsers: jest.fn(),
  assignProperty: jest.fn(),
  removePropertyAssignment: jest.fn()
}));

import { 
  getProperties, 
  createProperty, 
  updateProperty, 
  deleteProperty,
  getUsers,
  assignProperty,
  removePropertyAssignment
} from './apiClient';

// Mock properties data
const mockProperties = [
  {
    property_id: 1,
    name: 'Grand Hotel',
    address: '123 Main St, City',
    type: 'hotel',
    status: 'active',
    description: 'A luxury hotel in the heart of the city',
    managers: [
      { user_id: 2, username: 'manager1' }
    ]
  },
  {
    property_id: 2,
    name: 'Beachside Resort',
    address: '456 Ocean Blvd, Beach City',
    type: 'resort',
    status: 'active',
    description: 'A beautiful resort by the ocean',
    managers: []
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

describe('PropertyManagement Component', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
    
    // Mock API responses
    getProperties.mockResolvedValue({ properties: mockProperties });
    getUsers.mockResolvedValue({ users: mockUsers });
    createProperty.mockResolvedValue({ property_id: 3, message: 'Property created successfully' });
    updateProperty.mockResolvedValue({ message: 'Property updated successfully' });
    deleteProperty.mockResolvedValue({ message: 'Property deleted successfully' });
    assignProperty.mockResolvedValue({ message: 'Property assigned successfully' });
    removePropertyAssignment.mockResolvedValue({ message: 'Property assignment removed successfully' });
  });

  test('renders property management component', async () => {
    render(
      <TestWrapper>
        <PropertyManagement />
      </TestWrapper>
    );
    
    // Check if component title is displayed
    expect(screen.getByText(/property management/i)).toBeInTheDocument();
    
    // Wait for properties to load
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
    });
    
    // Check if properties are displayed
    expect(screen.getByText(/grand hotel/i)).toBeInTheDocument();
    expect(screen.getByText(/beachside resort/i)).toBeInTheDocument();
  });

  test('can open create property dialog', async () => {
    render(
      <TestWrapper>
        <PropertyManagement />
      </TestWrapper>
    );
    
    // Wait for properties to load
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
    });
    
    // Find and click the add property button
    const addButton = screen.getByText(/add property/i);
    fireEvent.click(addButton);
    
    // Check if dialog is open
    expect(screen.getByText(/create property/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
  });

  test('can create a new property', async () => {
    render(
      <TestWrapper>
        <PropertyManagement />
      </TestWrapper>
    );
    
    // Wait for properties to load
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
    });
    
    // Open create property dialog
    const addButton = screen.getByText(/add property/i);
    fireEvent.click(addButton);
    
    // Fill out the form
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'New Property' } });
    
    const addressInput = screen.getByLabelText(/address/i);
    fireEvent.change(addressInput, { target: { value: '789 New Address' } });
    
    const typeSelect = screen.getByLabelText(/type/i);
    fireEvent.change(typeSelect, { target: { value: 'apartment' } });
    
    const descriptionInput = screen.getByLabelText(/description/i);
    fireEvent.change(descriptionInput, { target: { value: 'A new test property' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if createProperty was called with the correct data
    await waitFor(() => {
      expect(createProperty).toHaveBeenCalledWith({
        name: 'New Property',
        address: '789 New Address',
        type: 'apartment',
        description: 'A new test property',
        status: 'active'
      });
    });
    
    // Check if properties are refreshed after creation
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can view property details', async () => {
    render(
      <TestWrapper>
        <PropertyManagement />
      </TestWrapper>
    );
    
    // Wait for properties to load
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
    });
    
    // Find and click the view button for the first property
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);
    
    // Check if property details are displayed
    await waitFor(() => {
      expect(screen.getByText(/property details/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/grand hotel/i)).toBeInTheDocument();
    expect(screen.getByText(/123 main st, city/i)).toBeInTheDocument();
    expect(screen.getByText(/hotel/i)).toBeInTheDocument();
    expect(screen.getByText(/a luxury hotel in the heart of the city/i)).toBeInTheDocument();
  });

  test('can edit a property', async () => {
    render(
      <TestWrapper>
        <PropertyManagement />
      </TestWrapper>
    );
    
    // Wait for properties to load
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
    });
    
    // Find and click the edit button for the first property
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);
    
    // Wait for the edit dialog to appear
    await waitFor(() => {
      expect(screen.getByText(/edit property/i)).toBeInTheDocument();
    });
    
    // Update the property name
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Grand Hotel' } });
    
    // Submit the form
    const updateButton = screen.getByRole('button', { name: /update/i });
    fireEvent.click(updateButton);
    
    // Check if updateProperty was called with the correct data
    await waitFor(() => {
      expect(updateProperty).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'Updated Grand Hotel'
      }));
    });
    
    // Check if properties are refreshed after update
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can delete a property', async () => {
    render(
      <TestWrapper>
        <PropertyManagement />
      </TestWrapper>
    );
    
    // Wait for properties to load
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
    });
    
    // Find and click the delete button for the first property
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    
    // Confirm deletion in the confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    // Check if deleteProperty was called with the correct id
    await waitFor(() => {
      expect(deleteProperty).toHaveBeenCalledWith(1);
    });
    
    // Check if properties are refreshed after deletion
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can open manager assignment dialog', async () => {
    render(
      <TestWrapper>
        <PropertyManagement />
      </TestWrapper>
    );
    
    // Wait for properties to load
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
    });
    
    // Find and click the manage button for the first property
    const manageButtons = screen.getAllByRole('button', { name: /assign/i });
    fireEvent.click(manageButtons[0]);
    
    // Check if the assignment dialog is open
    await waitFor(() => {
      expect(screen.getByText(/assign managers/i)).toBeInTheDocument();
    });
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Check if manager list is displayed
    expect(screen.getByText(/manager1/i)).toBeInTheDocument();
    expect(screen.getByText(/manager2/i)).toBeInTheDocument();
  });

  test('can assign a manager to a property', async () => {
    render(
      <TestWrapper>
        <PropertyManagement />
      </TestWrapper>
    );
    
    // Wait for properties to load
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
    });
    
    // Open the manager assignment dialog
    const manageButtons = screen.getAllByRole('button', { name: /assign/i });
    fireEvent.click(manageButtons[1]); // Second property (has no managers yet)
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Select a manager from the dropdown
    const managerSelect = screen.getByLabelText(/select manager/i);
    fireEvent.change(managerSelect, { target: { value: '3' } }); // manager2
    
    // Click the assign button
    const assignButton = screen.getByRole('button', { name: /assign manager/i });
    fireEvent.click(assignButton);
    
    // Check if assignProperty was called with the correct data
    await waitFor(() => {
      expect(assignProperty).toHaveBeenCalledWith({
        user_id: '3',
        property_id: 2
      });
    });
    
    // Check if users and properties are refreshed after assignment
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledTimes(2); // Initial load + refresh
      expect(getProperties).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  test('can remove a manager from a property', async () => {
    render(
      <TestWrapper>
        <PropertyManagement />
      </TestWrapper>
    );
    
    // Wait for properties to load
    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
    });
    
    // Open the manager assignment dialog for the first property (which has a manager)
    const manageButtons = screen.getAllByRole('button', { name: /assign/i });
    fireEvent.click(manageButtons[0]);
    
    // Wait for users to load
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled();
    });
    
    // Find and click the remove button for the assigned manager
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);
    
    // Confirm removal in the confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm removal/i)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    // Check if removePropertyAssignment was called with the correct data
    await waitFor(() => {
      expect(removePropertyAssignment).toHaveBeenCalledWith({
        user_id: 2,
        property_id: 1
      });
    });
    
    // Check if users and properties are refreshed after removal
    await waitFor(() => {
      expect(getUsers).toHaveBeenCalledTimes(2); // Initial load + refresh
      expect(getProperties).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });
}); 