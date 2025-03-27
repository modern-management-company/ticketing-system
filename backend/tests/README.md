# Testing the Ticketing System Backend

This directory contains unit tests for the Ticketing System backend API.

## Running Tests

### Using the test scripts

We've created two helper scripts at the root of the project to run tests:

1. To run all tests:
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
   # or
   ./run_tests.sh -s
   ```

4. To run specific tests and skip external services:
   ```
   ./run_tests.sh backend/tests/test_missing_routes.py --skip-external
   ```

5. For email service tests specifically:
   ```
   ./run_email_tests.sh
   ```

### Manually running tests

If you need to run tests manually, ensure you set the following environment variables:

```bash
export DATABASE_URL="sqlite:///:memory:"
export FLASK_ENV="testing"
export SECRET_KEY="test-secret-key"
export JWT_SECRET_KEY="test-jwt-secret-key"
```

Then run from the backend directory:

```bash
cd backend
python -m unittest discover -s tests
```

## Troubleshooting

### Import Errors

If you encounter import errors, there may be several causes:

1. The import paths in the test files might be using absolute imports (e.g., `from app import app`) which won't work if you're not running from the backend directory.

2. A Python module in the project might conflict with a standard library module (e.g., `token.py`).

3. The package structure may not be properly recognized if not running the tests correctly.

### Database Errors

Make sure the `DATABASE_URL` environment variable is set to an in-memory SQLite database for tests:

```
export DATABASE_URL="sqlite:///:memory:"
```

### Missing Dependencies

If tests fail due to missing dependencies, install them using:

```
pip install -r backend/requirements.txt
```

## Test Coverage

These tests cover:

- API endpoints
- Authentication and authorization
- Database models
- Email services
- Admin operations
- User operations
- Property management
- Ticket and task handling

# Backend API Tests

This directory contains test cases for the backend API endpoints. The tests are organized into categories based on functionality:

## Test Coverage Overview

### User Management (`test_user_management.py`)
- User registration (`/api/register`)
- User login (`/api/login`)
- Get user list (`/api/users`)
- Get user by ID (`/api/users/{user_id}`)
- Update user (`/api/users/{user_id}`)
- Delete user (`/api/users/{user_id}`)

### Property Management (`test_property_management.py`)
- Get properties (`/properties`)
- Create property (`/properties`)
- Get property by ID (`/properties/{property_id}`)
- Update property (`/properties/{property_id}`)
- Delete property (`/properties/{property_id}`)
- Get properties by user (`/users/{user_id}/properties`)
- Get managed properties (`/users/{user_id}/managed-properties`)

### Room Management (in `test_property_management.py`)
- Get property rooms (`/properties/{property_id}/rooms`)
- Create room (`/properties/{property_id}/rooms`)
- Get room by ID (`/properties/{property_id}/rooms/{room_id}`)
- Update room (`/properties/{property_id}/rooms/{room_id}`)
- Delete room (`/properties/{property_id}/rooms/{room_id}`)

### Ticket Management (`test_ticket_management.py`)
- Create ticket (`/tickets`)
- Get tickets (`/tickets`)
- Get ticket by ID (`/tickets/{ticket_id}`)
- Update ticket (`/tickets/{ticket_id}`)
- Delete ticket (`/tickets/{ticket_id}`)
- Assign ticket to task (`/tickets/{ticket_id}/assign`)
- Filter tickets by property (`/properties/{property_id}/tickets`)

### Task Management (`test_task_management.py`)
- Create task (`/tasks`)
- Get tasks (`/tasks`)
- Get task by ID (`/tasks/{task_id}`)
- Update task (`/tasks/{task_id}`)
- Delete task (`/tasks/{task_id}`)
- Assign task (`/assign-task`)
- Get property tasks (`/properties/{property_id}/tasks`)
- Get task details (`/tasks/{task_id}/details`)

### Service Requests (`test_service_requests.py`)
- Create service request (`/service-requests`)
- Get service requests (`/service-requests`)
- Update service request (`/service-requests/{request_id}`)
- Delete service request (`/service-requests/{request_id}`)
- Complete service request (`/service-requests/{request_id}/complete`)
- Filter service requests by group (`/service-requests?request_group=value`)

### Reports (`test_reports.py`)
- Ticket report (`/api/reports/tickets`)
- Task report (`/api/reports/tasks`)
- Service request report (`/api/reports/requests`)
- Summary report (`/api/reports/summary`)
- Date range report (`/api/reports/tickets?start_date=X&end_date=Y`)
- Export report (`/api/reports/export`)
- Send report email (`/api/reports/send-email`)

### Email Service (`test_email_service.py`)
- Email service initialization
- Send email
- Email settings validation
- SMTP configuration tests
- Test email sending (`/api/test-email`)
- Run all email tests (`/api/test-all-emails`)

### Additional Routes Coverage (`test_missing_routes.py`)
- Check first user (`/check-first-user`)
- Verify token (`/verify-token`)
- Health check (`/ping`)
- Switch property (`/switch_property`)
- Dashboard statistics (`/dashboard/stats`)
- System settings (`/api/settings/system`)
- Get property managers (`/properties/{property_id}/managers`)
- Upload rooms via CSV (`/properties/{property_id}/rooms/upload`)
- Password reset (`/auth/request-reset`, `/auth/reset-password`)
- User profile (`/users/{user_id}/profile`)
- Change password (`/users/{user_id}/change-password`)
- Admin change password (`/users/{user_id}/admin-change-password`)
- Statistics (`/statistics`, `/properties/{property_id}/statistics`)
- Verify user properties (`/users/{user_id}/verify-properties`)
- Fix manager properties (`/fix-manager-properties`)

## Running the Tests

To run all tests:

```bash
cd backend
python -m unittest discover tests
```

To run a specific test file:

```bash
cd backend
python -m unittest tests/test_file_name.py
```

## Test Configuration

Tests use an in-memory SQLite database defined in `config.py` (TestConfig class) to avoid interfering with development or production databases.

## Test Data

Each test file includes setup code that creates test users, properties, and other necessary data for testing. The test data is destroyed after each test case completes to maintain test isolation. 