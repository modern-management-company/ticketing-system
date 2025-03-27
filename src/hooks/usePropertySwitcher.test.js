import { renderHook, act } from '@testing-library/react-hooks';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { usePropertySwitcher } from './usePropertySwitcher';
import React from 'react';

// Mock the AuthContext
jest.mock('../context/AuthContext', () => {
  const originalModule = jest.requireActual('../context/AuthContext');
  
  return {
    ...originalModule,
    useAuth: jest.fn()
  };
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

// Save original localStorage
const originalLocalStorage = global.localStorage;

describe('usePropertySwitcher Hook', () => {
  beforeAll(() => {
    // Replace localStorage with mock
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
  });
  
  afterAll(() => {
    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default property if user has assigned properties', () => {
    // Mock user with assigned properties
    useAuth.mockReturnValue({
      user: {
        assigned_properties: [
          { property_id: 1, name: 'Property 1' },
          { property_id: 2, name: 'Property 2' }
        ]
      }
    });
    
    // Mock localStorage.getItem to return null (no stored property)
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => usePropertySwitcher(), { wrapper });
    
    expect(result.current.currentProperty).toEqual({ property_id: 1, name: 'Property 1' });
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('currentPropertyId');
  });
  
  test('should initialize with stored property if it exists', () => {
    // Mock user with assigned properties
    useAuth.mockReturnValue({
      user: {
        assigned_properties: [
          { property_id: 1, name: 'Property 1' },
          { property_id: 2, name: 'Property 2' }
        ]
      }
    });
    
    // Mock localStorage.getItem to return a stored property id
    mockLocalStorage.getItem.mockReturnValue('2');
    
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => usePropertySwitcher(), { wrapper });
    
    expect(result.current.currentProperty).toEqual({ property_id: 2, name: 'Property 2' });
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('currentPropertyId');
  });
  
  test('should initialize with null if user has no assigned properties', () => {
    // Mock user with no assigned properties
    useAuth.mockReturnValue({
      user: {
        assigned_properties: []
      }
    });
    
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => usePropertySwitcher(), { wrapper });
    
    expect(result.current.currentProperty).toBeNull();
  });
  
  test('should switch to selected property', () => {
    // Mock user with assigned properties
    useAuth.mockReturnValue({
      user: {
        assigned_properties: [
          { property_id: 1, name: 'Property 1' },
          { property_id: 2, name: 'Property 2' }
        ]
      }
    });
    
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => usePropertySwitcher(), { wrapper });
    
    // Initial property should be Property 1
    expect(result.current.currentProperty).toEqual({ property_id: 1, name: 'Property 1' });
    
    // Switch to Property 2
    act(() => {
      result.current.switchProperty(2);
    });
    
    // Property should be updated
    expect(result.current.currentProperty).toEqual({ property_id: 2, name: 'Property 2' });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentPropertyId', '2');
  });
  
  test('should use first available property if stored property is not in assigned properties', () => {
    // Mock user with assigned properties
    useAuth.mockReturnValue({
      user: {
        assigned_properties: [
          { property_id: 1, name: 'Property 1' },
          { property_id: 2, name: 'Property 2' }
        ]
      }
    });
    
    // Mock localStorage.getItem to return a non-existing property id
    mockLocalStorage.getItem.mockReturnValue('3');
    
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => usePropertySwitcher(), { wrapper });
    
    expect(result.current.currentProperty).toEqual({ property_id: 1, name: 'Property 1' });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentPropertyId', '1');
  });
  
  test('should update property list when user changes', () => {
    // First render with initial user
    useAuth.mockReturnValue({
      user: {
        assigned_properties: [
          { property_id: 1, name: 'Property 1' }
        ]
      }
    });
    
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result, rerender } = renderHook(() => usePropertySwitcher(), { wrapper });
    
    // Initial property should be Property 1
    expect(result.current.currentProperty).toEqual({ property_id: 1, name: 'Property 1' });
    
    // Update user properties
    useAuth.mockReturnValue({
      user: {
        assigned_properties: [
          { property_id: 1, name: 'Property 1' },
          { property_id: 2, name: 'Property 2' },
          { property_id: 3, name: 'Property 3' }
        ]
      }
    });
    
    // Rerender to trigger useEffect
    rerender();
    
    // Available properties should be updated
    expect(result.current.availableProperties).toEqual([
      { property_id: 1, name: 'Property 1' },
      { property_id: 2, name: 'Property 2' },
      { property_id: 3, name: 'Property 3' }
    ]);
    
    // Current property should remain the same
    expect(result.current.currentProperty).toEqual({ property_id: 1, name: 'Property 1' });
  });
}); 