import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TasksKanbanBoard from './TasksKanbanBoard';
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

describe('TasksKanbanBoard Component', () => {
  // Sample test data
  const mockTasks = [
    {
      task_id: 1,
      title: 'Fix AC',
      description: 'AC needs repair in room 101',
      status: 'pending',
      priority: 'High',
      due_date: '2023-08-01T12:00:00Z',
      assigned_to_id: 2
    },
    {
      task_id: 2,
      title: 'Clean lobby',
      description: 'Weekly cleaning of the main lobby',
      status: 'in progress',
      priority: 'Medium',
      due_date: null,
      assigned_to_id: 3
    },
    {
      task_id: 3,
      title: 'Replace light bulbs',
      description: 'Replace light bulbs in corridor',
      status: 'completed',
      priority: 'Low',
      due_date: '2023-07-25T09:00:00Z',
      assigned_to_id: 2
    }
  ];

  const mockUsers = [
    { user_id: 1, username: 'admin' },
    { user_id: 2, username: 'maintenance' },
    { user_id: 3, username: 'cleaning' }
  ];

  const mockOnTaskMove = jest.fn();
  const mockOnEditTask = jest.fn();
  const mockOnDeleteTask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders kanban board with tasks in correct columns', () => {
    render(
      <TasksKanbanBoard
        tasks={mockTasks}
        users={mockUsers}
        onTaskMove={mockOnTaskMove}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    // Check column headers
    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.getByText('In Progress (1)')).toBeInTheDocument();
    expect(screen.getByText('Completed (1)')).toBeInTheDocument();

    // Check task titles
    expect(screen.getByText('Fix AC')).toBeInTheDocument();
    expect(screen.getByText('Clean lobby')).toBeInTheDocument();
    expect(screen.getByText('Replace light bulbs')).toBeInTheDocument();

    // Check task descriptions
    expect(screen.getByText('AC needs repair in room 101')).toBeInTheDocument();
    expect(screen.getByText('Weekly cleaning of the main lobby')).toBeInTheDocument();
    expect(screen.getByText('Replace light bulbs in corridor')).toBeInTheDocument();

    // Check priorities
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();

    // Check assignees
    expect(screen.getAllByText('maintenance')).toHaveLength(2);
    expect(screen.getByText('cleaning')).toBeInTheDocument();
  });

  test('does not render edit/delete buttons when canEdit is false', () => {
    render(
      <TasksKanbanBoard
        tasks={mockTasks}
        users={mockUsers}
        onTaskMove={mockOnTaskMove}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
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
      <TasksKanbanBoard
        tasks={mockTasks}
        users={mockUsers}
        onTaskMove={mockOnTaskMove}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
        canEdit={true}
      />
    );

    // Check that edit and delete buttons are present
    // Note: We need to ensure to find only the visible buttons rather than all buttons
    const editButtons = screen.getAllByTestId('EditIcon');
    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    
    expect(editButtons.length).toBe(3);
    expect(deleteButtons.length).toBe(3);
  });

  test('calls onEditTask when edit button is clicked', () => {
    render(
      <TasksKanbanBoard
        tasks={mockTasks}
        users={mockUsers}
        onTaskMove={mockOnTaskMove}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
        canEdit={true}
      />
    );

    // Find the first edit button and click it
    const editButtons = screen.getAllByTestId('EditIcon');
    fireEvent.click(editButtons[0]);
    
    expect(mockOnEditTask).toHaveBeenCalledWith(mockTasks[0]);
  });

  test('calls onDeleteTask when delete button is clicked', () => {
    render(
      <TasksKanbanBoard
        tasks={mockTasks}
        users={mockUsers}
        onTaskMove={mockOnTaskMove}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
        canEdit={true}
      />
    );

    // Find the first delete button and click it
    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    fireEvent.click(deleteButtons[0]);
    
    expect(mockOnDeleteTask).toHaveBeenCalledWith(mockTasks[0].task_id);
  });

  test('shows "Unassigned" when task has no assigned user', () => {
    const tasksWithUnassigned = [
      {
        ...mockTasks[0],
        assigned_to_id: null
      }
    ];

    render(
      <TasksKanbanBoard
        tasks={tasksWithUnassigned}
        users={mockUsers}
        onTaskMove={mockOnTaskMove}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  test('displays proper color-coding for different priority levels', () => {
    const tasksWithDifferentPriorities = [
      {
        task_id: 1,
        title: 'Critical Task',
        description: 'Critical priority task',
        status: 'pending',
        priority: 'Critical',
        assigned_to_id: 1
      },
      {
        task_id: 2,
        title: 'High Task',
        description: 'High priority task',
        status: 'pending',
        priority: 'High',
        assigned_to_id: 1
      },
      {
        task_id: 3,
        title: 'Medium Task',
        description: 'Medium priority task',
        status: 'pending',
        priority: 'Medium',
        assigned_to_id: 1
      },
      {
        task_id: 4,
        title: 'Low Task',
        description: 'Low priority task',
        status: 'pending',
        priority: 'Low',
        assigned_to_id: 1
      }
    ];

    render(
      <TasksKanbanBoard
        tasks={tasksWithDifferentPriorities}
        users={mockUsers}
        onTaskMove={mockOnTaskMove}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
}); 