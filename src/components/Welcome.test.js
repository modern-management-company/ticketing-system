import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Welcome from './Welcome';
import '@testing-library/jest-dom';

// Mock navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Welcome Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders welcome page with title and subtitle', () => {
    render(<Welcome />);
    
    // Check main title is present
    expect(screen.getByText('Welcome to Ticketing System')).toBeInTheDocument();
    
    // Check subtitle is present
    expect(screen.getByText('Your comprehensive solution for property management and maintenance')).toBeInTheDocument();
  });

  test('renders sign in button', () => {
    render(<Welcome />);
    
    // Check if sign in button exists
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();
  });

  test('navigates to login page when sign in button is clicked', () => {
    render(<Welcome />);
    
    // Find and click the sign in button
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(signInButton);
    
    // Check if navigation was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('renders footer with current year', () => {
    render(<Welcome />);
    
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Check if footer contains the current year
    expect(screen.getByText(`© ${currentYear} Ticketing System. All rights reserved.`)).toBeInTheDocument();
  });

  test('renders description text', () => {
    render(<Welcome />);
    
    // Check if description is present
    expect(screen.getByText('Manage tickets, tasks, and service requests efficiently')).toBeInTheDocument();
  });
}); 