import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TaskList from './TaskList';
import { AuthProvider } from '../context/AuthContext';
import { TicketProvider } from '../context/TicketContext';
import { NotificationProvider } from '../context/NotificationContext';

// Mock the API calls
jest.mock('../services/api', () => ({
  getTasks: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

const mockTasks = [
  {
    id: 1,
    title: 'Test Task 1',
    description: 'Test Description 1',
    status: 'pending',
    priority: 'high',
    due_date: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    assigned_to: {
      id: 1,
      username: 'testuser',
    },
    ticket: {
      id: 1,
      title: 'Test Ticket 1',
    },
  },
  {
    id: 2,
    title: 'Test Task 2',
    description: 'Test Description 2',
    status: 'completed',
    priority: 'medium',
    due_date: '2024-01-02T00:00:00Z',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    assigned_to: {
      id: 2,
      username: 'anotheruser',
    },
    ticket: {
      id: 2,
      title: 'Test Ticket 2',
    },
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <TicketProvider>
          <NotificationProvider>
            <TaskList />
          </NotificationProvider>
        </TicketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('TaskList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('displays tasks when loaded', async () => {
    const { getTasks } = require('../services/api');
    getTasks.mockResolvedValueOnce(mockTasks);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      expect(screen.getByText('Test Task 2')).toBeInTheDocument();
    });
  });

  test('handles task status update', async () => {
    const { getTasks, updateTask } = require('../services/api');
    getTasks.mockResolvedValueOnce(mockTasks);
    updateTask.mockResolvedValueOnce({ success: true });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(statusSelect, { target: { value: 'in_progress' } });

    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith(1, { status: 'in_progress' });
    });
  });

  test('handles task deletion', async () => {
    const { getTasks, deleteTask } = require('../services/api');
    getTasks.mockResolvedValueOnce(mockTasks);
    deleteTask.mockResolvedValueOnce({ success: true });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByText('Delete')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteTask).toHaveBeenCalledWith(1);
    });
  });

  test('displays error message when API call fails', async () => {
    const { getTasks } = require('../services/api');
    getTasks.mockRejectedValueOnce(new Error('API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Error loading tasks')).toBeInTheDocument();
    });
  });

  test('filters tasks by status', async () => {
    const { getTasks } = require('../services/api');
    getTasks.mockResolvedValueOnce(mockTasks);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    const statusFilter = screen.getByLabelText('Status');
    fireEvent.change(statusFilter, { target: { value: 'completed' } });

    expect(screen.queryByText('Test Task 1')).not.toBeInTheDocument();
    expect(screen.getByText('Test Task 2')).toBeInTheDocument();
  });

  test('filters tasks by priority', async () => {
    const { getTasks } = require('../services/api');
    getTasks.mockResolvedValueOnce(mockTasks);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    const priorityFilter = screen.getByLabelText('Priority');
    fireEvent.change(priorityFilter, { target: { value: 'high' } });

    expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Task 2')).not.toBeInTheDocument();
  });

  test('sorts tasks by due date', async () => {
    const { getTasks } = require('../services/api');
    getTasks.mockResolvedValueOnce(mockTasks);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort By');
    fireEvent.change(sortSelect, { target: { value: 'due_date' } });

    const tasks = screen.getAllByRole('row');
    expect(tasks[1]).toHaveTextContent('Test Task 1');
    expect(tasks[2]).toHaveTextContent('Test Task 2');
  });

  test('navigates to task details', async () => {
    const { getTasks } = require('../services/api');
    getTasks.mockResolvedValueOnce(mockTasks);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    const taskLink = screen.getByText('Test Task 1');
    fireEvent.click(taskLink);

    expect(window.location.pathname).toBe('/tasks/1');
  });
}); 