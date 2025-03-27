# Ticketing System
Ticketing system for hotel management

## Overview
This is a comprehensive ticketing and property management system designed for hotels and similar properties. It provides functionality for managing service requests, maintenance tickets, tasks, and property information.

## Project Structure
- `backend/`: Flask API server
- `frontend/`: React.js frontend application
- `scripts/`: Utility scripts for development and deployment

## Running Tests

We've added scripts to simplify running tests:

### Backend Tests
1. To run all backend tests:
   ```
   ./run_tests.sh
   ```

2. To run a specific test file:
   ```
   ./run_tests.sh backend/tests/test_missing_routes.py
   ```

3. To skip tests that require external services (SMTP, etc.):
   ```
   ./run_tests.sh --skip-external
   ```

4. For email service tests specifically:
   ```
   ./run_email_tests.sh
   ```

See `backend/tests/README.md` for more detailed information about the test structure and troubleshooting.

### Frontend Tests
To run the frontend tests:
```
cd frontend
npm test
```

## Development Setup
1. Clone the repository
2. Set up the backend:
   ```
   cd backend
   pip install -r requirements.txt
   ```
3. Set up the frontend:
   ```
   cd frontend
   npm install
   ```

## Running the Application
1. Start the backend:
   ```
   cd backend
   ./start.sh
   ```
2. Start the frontend:
   ```
   cd frontend
   npm start
   ```
