import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TicketForm from './TicketForm';
import { AuthProvider } from '../context/AuthContext';
import { TicketProvider } from '../context/TicketContext';
import { NotificationProvider } from '../context/NotificationContext';

// Mock the API calls
jest.mock('../services/api', () => ({
  createTicket: jest.fn(),
  getProperties: jest.fn(),
  getRooms: jest.fn(),
}));

const mockProperties = [
  { id: 1, name: 'Property 1' },
  { id: 2, name: 'Property 2' },
];

const mockRooms = [
  { id: 1, name: 'Room 1', property_id: 1 },
  { id: 2, name: 'Room 2', property_id: 1 },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <TicketProvider>
          <NotificationProvider>
            <TicketForm />
          </NotificationProvider>
        </TicketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('TicketForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form fields', () => {
    renderComponent();
    
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Property')).toBeInTheDocument();
    expect(screen.getByLabelText('Room')).toBeInTheDocument();
  });

  test('loads properties and rooms', async () => {
    const { getProperties, getRooms } = require('../services/api');
    getProperties.mockResolvedValueOnce(mockProperties);
    getRooms.mockResolvedValueOnce(mockRooms);

    renderComponent();

    await waitFor(() => {
      expect(getProperties).toHaveBeenCalled();
      expect(getRooms).toHaveBeenCalled();
    });
  });

  test('validates required fields', async () => {
    renderComponent();

    const submitButton = screen.getByText('Create Ticket');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('Priority is required')).toBeInTheDocument();
      expect(screen.getByText('Category is required')).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    const { createTicket, getProperties, getRooms } = require('../services/api');
    getProperties.mockResolvedValueOnce(mockProperties);
    getRooms.mockResolvedValueOnce(mockRooms);
    createTicket.mockResolvedValueOnce({ success: true });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Property')).toBeInTheDocument();
    });

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Test Ticket' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test Description' },
    });
    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'high' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'maintenance' },
    });
    fireEvent.change(screen.getByLabelText('Property'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Room'), {
      target: { value: '1' },
    });

    const submitButton = screen.getByText('Create Ticket');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createTicket).toHaveBeenCalledWith({
        title: 'Test Ticket',
        description: 'Test Description',
        priority: 'high',
        category: 'maintenance',
        property_id: 1,
        room_id: 1,
      });
    });
  });

  test('handles API error on submit', async () => {
    const { createTicket, getProperties, getRooms } = require('../services/api');
    getProperties.mockResolvedValueOnce(mockProperties);
    getRooms.mockResolvedValueOnce(mockRooms);
    createTicket.mockRejectedValueOnce(new Error('API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Property')).toBeInTheDocument();
    });

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Test Ticket' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test Description' },
    });
    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'high' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'maintenance' },
    });
    fireEvent.change(screen.getByLabelText('Property'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Room'), {
      target: { value: '1' },
    });

    const submitButton = screen.getByText('Create Ticket');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error creating ticket')).toBeInTheDocument();
    });
  });

  test('updates room options when property changes', async () => {
    const { getProperties, getRooms } = require('../services/api');
    getProperties.mockResolvedValueOnce(mockProperties);
    getRooms.mockResolvedValueOnce(mockRooms);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Property')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Property'), {
      target: { value: '1' },
    });

    await waitFor(() => {
      expect(getRooms).toHaveBeenCalledWith(1);
    });
  });
}); 