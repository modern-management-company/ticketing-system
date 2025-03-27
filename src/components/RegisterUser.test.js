import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterUser from './RegisterUser';
import apiClient from './apiClient';
import '@testing-library/jest-dom';

// Mock apiClient
jest.mock('./apiClient', () => ({
  post: jest.fn()
}));

// Mock navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('RegisterUser Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders register form correctly', () => {
    render(
      <BrowserRouter>
        <RegisterUser />
      </BrowserRouter>
    );

    // Check if form elements are rendered
    expect(screen.getByText('Register User')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/I agree to receive SMS notifications/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account\? Sign in/i)).toBeInTheDocument();
  });

  test('renders admin registration form when isAdminRegistration is true', () => {
    render(
      <BrowserRouter>
        <RegisterUser isAdminRegistration={true} />
      </BrowserRouter>
    );

    expect(screen.getByText('Create Admin Account')).toBeInTheDocument();
  });

  test('updates form data when input values change', () => {
    render(
      <BrowserRouter>
        <RegisterUser />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const phoneInput = screen.getByLabelText(/phone number/i);
    const smsCheckbox = screen.getByLabelText(/I agree to receive SMS notifications/i);

    // Type in form fields
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(phoneInput, { target: { value: '+1234567890' } });
    fireEvent.click(smsCheckbox);

    // Check if inputs have the entered values
    expect(usernameInput).toHaveValue('testuser');
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
    expect(phoneInput).toHaveValue('+1234567890');
    expect(smsCheckbox).toBeChecked();
  });

  test('shows error for invalid email format', async () => {
    render(
      <BrowserRouter>
        <RegisterUser />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const registerButton = screen.getByRole('button', { name: /register/i });

    // Fill form with invalid email
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit form
    fireEvent.click(registerButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
    
    // API should not be called
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  test('shows error for short password', async () => {
    render(
      <BrowserRouter>
        <RegisterUser />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const registerButton = screen.getByRole('button', { name: /register/i });

    // Fill form with short password
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '12345' } });
    
    // Submit form
    fireEvent.click(registerButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();
    });
    
    // API should not be called
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  test('shows error for invalid phone number', async () => {
    render(
      <BrowserRouter>
        <RegisterUser />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const phoneInput = screen.getByLabelText(/phone number/i);
    const registerButton = screen.getByRole('button', { name: /register/i });

    // Fill form with invalid phone
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(phoneInput, { target: { value: 'not-a-number' } });
    
    // Submit form
    fireEvent.click(registerButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid phone number in international format/i)).toBeInTheDocument();
    });
    
    // API should not be called
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  test('submits form successfully with valid data', async () => {
    // Mock successful API response
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <BrowserRouter>
        <RegisterUser />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const phoneInput = screen.getByLabelText(/phone number/i);
    const smsCheckbox = screen.getByLabelText(/I agree to receive SMS notifications/i);
    const registerButton = screen.getByRole('button', { name: /register/i });

    // Fill form with valid data
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(phoneInput, { target: { value: '+1234567890' } });
    fireEvent.click(smsCheckbox);
    
    // Submit form
    fireEvent.click(registerButton);

    // Check if API is called with correct data
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/register", {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        phone: '+1234567890',
        consentToSms: true,
        role: 'user'
      });
    });
    
    // Check success message
    await waitFor(() => {
      expect(screen.getByText(/Registration successful!/i)).toBeInTheDocument();
    });
    
    // Check if form is reset
    expect(usernameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
    expect(phoneInput).toHaveValue('');
    expect(smsCheckbox).not.toBeChecked();
    
    // Check if navigation occurs after delay
    jest.runAllTimers(); // Fast-forward timer
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('shows error message when API call fails', async () => {
    // Mock API error
    const errorMessage = 'Username already exists';
    apiClient.post.mockRejectedValueOnce({
      response: {
        data: {
          msg: errorMessage
        }
      }
    });

    render(
      <BrowserRouter>
        <RegisterUser />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const registerButton = screen.getByRole('button', { name: /register/i });

    // Fill form with valid data
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit form
    fireEvent.click(registerButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
}); 