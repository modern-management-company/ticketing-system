import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TicketKanbanBoard from './TicketKanbanBoard';
import '@testing-library/jest-dom';

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({
    innerRef: jest.fn(),
    droppableProps: {},
    placeholder: null
  }),
  Draggable: ({ children }) => children({
    innerRef: jest.fn(),
    draggableProps: {},
    dragHandleProps: {}
  })
}));

describe('TicketKanbanBoard Component', () => {
  // Sample test data
  const mockTickets = [
    {
      ticket_id: 1,
      title: 'Broken AC',
      description: 'AC is not working in room 101',
      status: 'open',
      priority: 'High',
      category: 'Maintenance',
      subcategory: 'HVAC',
      room_name: 'Room 101',
      created_by_username: 'guest1',
      created_by_group: 'Hotel A'
    },
    {
      ticket_id: 2,
      title: 'Clogged Sink',
      description: 'Bathroom sink is not draining properly',
      status: 'in progress',
      priority: 'Medium',
      category: 'Plumbing',
      subcategory: 'Drain',
      room_name: 'Room 203',
      created_by_username: 'guest2',
      created_by_group: 'Hotel B'
    },
    {
      ticket_id: 3,
      title: 'Light Bulb Replacement',
      description: 'Light bulb needs replacement in the bathroom',
      status: 'completed',
      priority: 'Low',
      category: 'Electrical',
      subcategory: 'Lighting',
      room_name: 'Room 305',
      created_by_username: 'staff1',
      created_by_group: null
    }
  ];

  const mockOnTicketMove = jest.fn();
  const mockOnEditTicket = jest.fn();
  const mockOnDeleteTicket = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders kanban board with tickets in correct columns', () => {
    render(
      <TicketKanbanBoard
        tickets={mockTickets}
        onTicketMove={mockOnTicketMove}
        onEditTicket={mockOnEditTicket}
        onDeleteTicket={mockOnDeleteTicket}
      />
    );

    // Check column headers
    expect(screen.getByText('Open (1)')).toBeInTheDocument();
    expect(screen.getByText('In Progress (1)')).toBeInTheDocument();
    expect(screen.getByText('Completed (1)')).toBeInTheDocument();

    // Check ticket titles
    expect(screen.getByText('Broken AC')).toBeInTheDocument();
    expect(screen.getByText('Clogged Sink')).toBeInTheDocument();
    expect(screen.getByText('Light Bulb Replacement')).toBeInTheDocument();

    // Check ticket descriptions
    expect(screen.getByText('AC is not working in room 101')).toBeInTheDocument();
    expect(screen.getByText('Bathroom sink is not draining properly')).toBeInTheDocument();
    expect(screen.getByText('Light bulb needs replacement in the bathroom')).toBeInTheDocument();

    // Check priorities
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();

    // Check room names
    expect(screen.getByText('Room 101')).toBeInTheDocument();
    expect(screen.getByText('Room 203')).toBeInTheDocument();
    expect(screen.getByText('Room 305')).toBeInTheDocument();

    // Check categories
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Plumbing')).toBeInTheDocument();
    expect(screen.getByText('Electrical')).toBeInTheDocument();

    // Check creator usernames
    expect(screen.getByText('guest1')).toBeInTheDocument();
    expect(screen.getByText('guest2')).toBeInTheDocument();
    expect(screen.getByText('staff1')).toBeInTheDocument();
  });

  test('does not render edit/delete buttons when canEdit is false', () => {
    render(
      <TicketKanbanBoard
        tickets={mockTickets}
        onTicketMove={mockOnTicketMove}
        onEditTicket={mockOnEditTicket}
        onDeleteTicket={mockOnDeleteTicket}
        canEdit={false}
      />
    );

    // Check that edit and delete buttons are not present
    const editButtons = screen.queryAllByRole('button', { name: /edit/i });
    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    
    expect(editButtons.length).toBe(0);
    expect(deleteButtons.length).toBe(0);
  });

  test('renders edit/delete buttons when canEdit is true', () => {
    render(
      <TicketKanbanBoard
        tickets={mockTickets}
        onTicketMove={mockOnTicketMove}
        onEditTicket={mockOnEditTicket}
        onDeleteTicket={mockOnDeleteTicket}
        canEdit={true}
      />
    );

    // Check that edit and delete buttons are present
    const editButtons = screen.getAllByTestId('EditIcon');
    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    
    expect(editButtons.length).toBe(3);
    expect(deleteButtons.length).toBe(3);
  });

  test('calls onEditTicket when edit button is clicked', () => {
    render(
      <TicketKanbanBoard
        tickets={mockTickets}
        onTicketMove={mockOnTicketMove}
        onEditTicket={mockOnEditTicket}
        onDeleteTicket={mockOnDeleteTicket}
        canEdit={true}
      />
    );

    // Find the first edit button and click it
    const editButtons = screen.getAllByTestId('EditIcon');
    fireEvent.click(editButtons[0]);
    
    expect(mockOnEditTicket).toHaveBeenCalledWith(mockTickets[0]);
  });

  test('calls onDeleteTicket when delete button is clicked', () => {
    render(
      <TicketKanbanBoard
        tickets={mockTickets}
        onTicketMove={mockOnTicketMove}
        onEditTicket={mockOnEditTicket}
        onDeleteTicket={mockOnDeleteTicket}
        canEdit={true}
      />
    );

    // Find the first delete button and click it
    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    fireEvent.click(deleteButtons[0]);
    
    expect(mockOnDeleteTicket).toHaveBeenCalledWith(mockTickets[0].ticket_id);
  });

  test('displays ticket with missing optional fields correctly', () => {
    const ticketsWithMissingFields = [{
      ticket_id: 1,
      title: 'Test Ticket',
      description: 'Test description',
      status: 'open',
      priority: 'Medium',
      category: 'General',
      subcategory: null,
      room_name: null,
      created_by_username: 'tester',
      created_by_group: null
    }];

    render(
      <TicketKanbanBoard
        tickets={ticketsWithMissingFields}
        onTicketMove={mockOnTicketMove}
        onEditTicket={mockOnEditTicket}
        onDeleteTicket={mockOnDeleteTicket}
      />
    );

    expect(screen.getByText('Test Ticket')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('tester')).toBeInTheDocument();
    
    // Room name chip should not be rendered
    expect(screen.queryByTestId('RoomIcon')).not.toBeInTheDocument();
  });

  test('displays proper color-coding for different priority levels', () => {
    const ticketsWithDifferentPriorities = [
      {
        ticket_id: 1,
        title: 'Critical Ticket',
        description: 'Critical priority ticket',
        status: 'open',
        priority: 'Critical',
        category: 'Urgent',
        created_by_username: 'user1'
      },
      {
        ticket_id: 2,
        title: 'High Ticket',
        description: 'High priority ticket',
        status: 'open',
        priority: 'High',
        category: 'Important',
        created_by_username: 'user1'
      },
      {
        ticket_id: 3,
        title: 'Medium Ticket',
        description: 'Medium priority ticket',
        status: 'open',
        priority: 'Medium',
        category: 'Regular',
        created_by_username: 'user1'
      },
      {
        ticket_id: 4,
        title: 'Low Ticket',
        description: 'Low priority ticket',
        status: 'open',
        priority: 'Low',
        category: 'Minor',
        created_by_username: 'user1'
      }
    ];

    render(
      <TicketKanbanBoard
        tickets={ticketsWithDifferentPriorities}
        onTicketMove={mockOnTicketMove}
        onEditTicket={mockOnEditTicket}
        onDeleteTicket={mockOnDeleteTicket}
      />
    );

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
}); 