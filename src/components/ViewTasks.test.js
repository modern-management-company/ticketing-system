import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ViewTasks from './ViewTasks';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('./apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn()
}));

import apiClient from './apiClient';

// Mock KanbanBoard component
jest.mock('./TasksKanbanBoard', () => ({
  __esModule: true,
  default: ({ tasks, users, onTaskMove, onEditTask, onDeleteTask }) => (
    <div data-testid="kanban-board">
      <span>Kanban Board</span>
      <span data-testid="task-count">{tasks.length}</span>
    </div>
  )
}));

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

// Mock tasks data
const mockTasks = [
  {
    task_id: 1,
    title: 'Clean Room 101',
    description: 'Daily cleaning',
    status: 'pending',
    priority: 'Medium',
    property_id: 1,
    assigned_to_id: 2,
    due_date: '2023-08-20T10:00:00.000Z',
    ticket_id: null,
    room_info: {
      room_name: 'Room 101',
      ticket_id: null
    }
  },
  {
    task_id: 2,
    title: 'Fix AC in Room 203',
    description: 'AC not cooling properly',
    status: 'in progress',
    priority: 'High',
    property_id: 1,
    assigned_to_id: 3,
    due_date: '2023-08-19T14:00:00.000Z',
    ticket_id: 101,
    room_info: {
      room_name: 'Room 203',
      ticket_id: 101
    }
  },
  {
    task_id: 3,
    title: 'Restock Mini Bar',
    description: 'Restock items in the mini bar',
    status: 'completed',
    priority: 'Low',
    property_id: 1,
    assigned_to_id: null,
    due_date: null,
    ticket_id: null,
    room_info: null
  }
];

// Mock users data
const mockUsers = [
  {
    user_id: 1,
    username: 'admin',
    role: 'super_admin',
    group: 'Admin'
  },
  {
    user_id: 2,
    username: 'housekeeper1',
    role: 'staff',
    group: 'Housekeeping'
  },
  {
    user_id: 3,
    username: 'maintenance1',
    role: 'staff',
    group: 'Maintenance'
  }
];

// Mock tickets data
const mockTickets = [
  {
    ticket_id: 101,
    title: 'AC repair needed',
    description: 'AC in room 203 not working',
    status: 'open',
    priority: 'High',
    property_id: 1
  },
  {
    ticket_id: 102,
    title: 'TV not working',
    description: 'TV in room 305 has no signal',
    status: 'open',
    priority: 'Medium',
    property_id: 1
  }
];

// Mock managers data
const mockManagers = [
  {
    user_id: 1,
    username: 'admin'
  }
];

// Mock context values
const mockAuthContext = {
  auth: {
    token: 'test-token',
    user: {
      user_id: 1,
      username: 'admin',
      role: 'super_admin',
      assigned_properties: [{ property_id: 1, name: 'Test Hotel' }]
    },
    assigned_properties: [{ property_id: 1, name: 'Test Hotel' }]
  },
  logout: jest.fn()
};

// Mock context hook
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: () => mockAuthContext
}));

// Mock useIsMobile hook
jest.mock('../hooks/useIsMobile', () => ({
  useIsMobile: () => false
}));

// Mock navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock window.confirm to always return true
global.confirm = jest.fn(() => true);

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

describe('ViewTasks Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({ data: { tasks: mockTasks } });
      } else if (url.includes('/users')) {
        return Promise.resolve({ data: { users: mockUsers } });
      } else if (url.includes('/tickets')) {
        return Promise.resolve({ data: { tickets: mockTickets } });
      } else if (url.includes('/managers')) {
        return Promise.resolve({ data: { managers: mockManagers } });
      }
      return Promise.resolve({ data: {} });
    });
    
    apiClient.post.mockResolvedValue({ 
      data: { msg: 'Task created successfully', task_id: 4 } 
    });
    
    apiClient.patch.mockResolvedValue({ 
      data: { msg: 'Task updated successfully', task: mockTasks[0] } 
    });
    
    apiClient.delete.mockResolvedValue({ 
      status: 200, 
      data: { msg: 'Task deleted successfully' } 
    });
  });

  test('renders task list component', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Check if component title is displayed
    await waitFor(() => {
      expect(screen.getByText(/active tasks/i)).toBeInTheDocument();
    });
    
    // Wait for the property switcher to load
    await waitFor(() => {
      expect(screen.getByTestId('property-switcher')).toBeInTheDocument();
    });
    
    // Wait for tasks to load (after property is selected)
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/tasks'));
    });
  });

  test('loads and displays tasks', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4); // tasks, users, tickets, managers
    });
    
    // Check if tasks are displayed (in table view, not mobile)
    await waitFor(() => {
      expect(screen.getByText('Clean Room 101')).toBeInTheDocument();
      expect(screen.getByText('Fix AC in Room 203')).toBeInTheDocument();
      // Completed task isn't shown by default
      expect(screen.queryByText('Restock Mini Bar')).not.toBeInTheDocument();
    });
  });

  test('can switch to completed tasks view', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });
    
    // Switch to completed tasks view
    const completedButton = screen.getByText('Completed');
    fireEvent.click(completedButton);
    
    // Check if completed tasks are displayed
    await waitFor(() => {
      expect(screen.getByText('Restock Mini Bar')).toBeInTheDocument();
      expect(screen.queryByText('Clean Room 101')).not.toBeInTheDocument();
    });
  });

  test('can open create task dialog', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });
    
    // Find and click create task button
    const createButton = screen.getByText('Create Task');
    fireEvent.click(createButton);
    
    // Check if dialog is displayed
    await waitFor(() => {
      expect(screen.getByText(/create task/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    });
  });

  test('can create a new task', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });
    
    // Open create task dialog
    const createButton = screen.getByText('Create Task');
    fireEvent.click(createButton);
    
    // Fill form
    await waitFor(() => {
      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'New Test Task' } });
      
      const descriptionInput = screen.getByLabelText(/description/i);
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
      
      const prioritySelect = screen.getByLabelText(/priority/i);
      fireEvent.change(prioritySelect, { target: { value: 'High' } });
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);
    });
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/tasks', expect.objectContaining({
        title: 'New Test Task',
        description: 'Test description',
        priority: 'High',
        property_id: 1
      }));
    });
    
    // Check if task list is refreshed
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/tasks'));
    });
  });

  test('can change task status', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });
    
    // Find and click the status select for the first task
    const statusSelect = screen.getAllByLabelText(/status/i)[0];
    fireEvent.change(statusSelect, { target: { value: 'in progress' } });
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/tasks/1', { status: 'in progress' });
    });
  });

  test('can assign a task to a user', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });
    
    // Find and click the assignee select for the first task
    const assigneeSelect = screen.getAllByLabelText(/assigned to/i)[0];
    fireEvent.change(assigneeSelect, { target: { value: '3' } });
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/tasks/1', { assigned_to_id: '3' });
    });
  });

  test('can delete a task', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });
    
    // Find and click the delete button for the first task
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/tasks/1');
    });
  });

  test('can switch to Kanban view', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });
    
    // Find and click the view toggle button
    const viewToggleButton = screen.getByRole('button', { name: /switch to kanban view/i });
    fireEvent.click(viewToggleButton);
    
    // Check if kanban board is displayed
    await waitFor(() => {
      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    });
  });

  test('can open import ticket dialog', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });
    
    // Find and click the import button
    const importButton = screen.getByText('Import from Ticket');
    fireEvent.click(importButton);
    
    // Check if import dialog is displayed
    await waitFor(() => {
      expect(screen.getByText(/import from ticket/i)).toBeInTheDocument();
      expect(screen.getByText('AC repair needed')).toBeInTheDocument();
      expect(screen.getByText('TV not working')).toBeInTheDocument();
    });
  });

  test('can import a task from ticket', async () => {
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(4);
    });
    
    // Open import dialog
    const importButton = screen.getByText('Import from Ticket');
    fireEvent.click(importButton);
    
    await waitFor(() => {
      expect(screen.getByText(/import from ticket/i)).toBeInTheDocument();
    });
    
    // Select the first ticket
    const selectTicketButton = screen.getAllByRole('button', { name: /select/i })[0];
    fireEvent.click(selectTicketButton);
    
    // Check if task form is prefilled with ticket data
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i).value).toContain('AC repair needed');
      expect(screen.getByLabelText(/description/i).value).toBe('AC in room 203 not working');
      expect(screen.getByLabelText(/priority/i).value).toBe('High');
    });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/tasks', expect.objectContaining({
        title: expect.stringContaining('AC repair needed'),
        ticket_id: 101,
        priority: 'High'
      }));
    });
  });

  test('shows error message on API failure', async () => {
    // Mock API error
    apiClient.get.mockRejectedValueOnce({
      response: { data: { message: 'Failed to load tasks' } }
    });
    
    render(
      <TestWrapper>
        <ViewTasks />
      </TestWrapper>
    );
    
    // Check if error is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    });
  });
}); 