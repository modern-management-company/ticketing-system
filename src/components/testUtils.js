import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './store/reducers';

export const renderWithProviders = (
  ui,
  {
    preloadedState = {},
    store = configureStore({ reducer: rootReducer, preloadedState }),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <Provider store={store}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

export const mockTicket = {
  id: 1,
  title: 'Test Ticket',
  description: 'This is a test ticket',
  priority: 'high',
  category: 'maintenance',
  subcategory: 'plumbing',
  status: 'open',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  group: 'Engineering',
};

export const mockProperty = {
  id: 1,
  name: 'Test Hotel',
  address: '123 Test St, Test City',
  type: 'hotel',
};

export const mockRoom = {
  id: 1,
  name: 'Room 101',
  property_id: 1,
  type: 'standard',
  floor: 1,
};

export const mockTask = {
  id: 1,
  title: 'Test Task',
  description: 'This is a test task',
  due_date: '2024-01-08T00:00:00Z',
  status: 'pending',
  assigned_to_id: 1,
  ticket_id: 1,
}; 