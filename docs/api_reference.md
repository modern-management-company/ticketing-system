# API Reference

## Overview

The Modern Management Ticketing System provides a comprehensive RESTful API that allows developers to interact with all aspects of the system. This document serves as a reference for available endpoints, authentication requirements, and data formats.

## Authentication

### JWT Authentication

All API requests (except public endpoints) require authentication using JSON Web Tokens (JWT).

#### Obtaining a Token

```
POST /login
```

Request body:
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "username": "your_username",
    "role": "manager",
    "email": "user@example.com"
  }
}
```

#### Using the Token

Include the token in the Authorization header of all API requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Verifying Token

```
GET /verify-token
```

Returns user information if the token is valid.

## Core Endpoints

### Users

#### Get All Users

```
GET /users
```

Permission: super_admin, general_manager, manager (limited to their team members)

Response: Array of user objects

#### Get User by ID

```
GET /users/{user_id}
```

Permission: super_admin, general_manager (for users under their properties), manager (for team members)

Response: User object

#### Create User

```
POST /users
```

Permission: super_admin, general_manager, manager (can only create regular users)

Request body:
```json
{
  "username": "new_user",
  "email": "new_user@example.com",
  "password": "secure_password",
  "role": "user",
  "group": "Maintenance",
  "phone": "+1234567890",
  "property_ids": [1, 2],
  "is_active": true
}
```

Response: Created user object

#### Update User

```
PATCH /users/{user_id}
```

Permission: super_admin, general_manager (for users under their properties), manager (for team members)

Request body: User properties to update

Response: Updated user object

#### Delete User

```
DELETE /users/{user_id}
```

Permission: super_admin, general_manager (for users under their properties)

Response: Success message

### Properties

#### Get All Properties

```
GET /properties
```

Permission: Any authenticated user (filtered by role)

Response: Array of property objects

#### Get Property by ID

```
GET /properties/{property_id}
```

Permission: Any authenticated user with access to the property

Response: Property object

#### Create Property

```
POST /properties
```

Permission: super_admin, general_manager

Request body:
```json
{
  "name": "Property Name",
  "address": "123 Main St",
  "type": "Hotel",
  "status": "active",
  "description": "Property description"
}
```

Response: Created property object

#### Update Property

```
PATCH /properties/{property_id}
```

Permission: super_admin, general_manager, manager (assigned to property)

Request body: Property properties to update

Response: Updated property object

### Tickets

#### Get All Tickets

```
GET /tickets
```

Permission: Any authenticated user (filtered by role and property assignment)

Query parameters:
- status: Filter by status
- property_id: Filter by property
- priority: Filter by priority

Response: Array of ticket objects

#### Get Ticket by ID

```
GET /tickets/{ticket_id}
```

Permission: Any authenticated user with access to the ticket's property

Response: Ticket object

#### Create Ticket

```
POST /tickets
```

Permission: Any authenticated user

Request body:
```json
{
  "title": "Ticket Title",
  "description": "Detailed description",
  "priority": "high",
  "category": "Maintenance",
  "subcategory": "Plumbing",
  "property_id": 1,
  "room_id": 5
}
```

Response: Created ticket object

#### Update Ticket

```
PATCH /tickets/{ticket_id}
```

Permission: Any authenticated user with appropriate access

Request body: Ticket properties to update

Response: Updated ticket object

### Tasks

#### Get All Tasks

```
GET /tasks
```

Permission: Any authenticated user (filtered by role and assignment)

Query parameters:
- status: Filter by status
- property_id: Filter by property
- priority: Filter by priority

Response: Array of task objects

#### Create Task

```
POST /tasks
```

Permission: super_admin, general_manager, manager

Request body:
```json
{
  "title": "Task Title",
  "description": "Task description",
  "status": "pending",
  "priority": "medium",
  "due_date": "2023-12-31T23:59:59Z",
  "property_id": 1,
  "assigned_to_id": 5
}
```

Response: Created task object

#### Update Task

```
PATCH /tasks/{task_id}
```

Permission: super_admin, general_manager, manager, or assigned user

Request body: Task properties to update

Response: Updated task object

### Rooms

#### Get Rooms by Property

```
GET /properties/{property_id}/rooms
```

Permission: Any authenticated user with access to the property

Response: Array of room objects

#### Create Room

```
POST /properties/{property_id}/rooms
```

Permission: super_admin, general_manager, manager (assigned to property)

Request body:
```json
{
  "name": "101",
  "type": "standard",
  "floor": 1,
  "status": "available",
  "capacity": 2,
  "amenities": ["wifi", "tv", "minibar"]
}
```

Response: Created room object

## Administrative Endpoints

### System Settings

#### Get System Settings

```
GET /api/settings/system
```

Permission: super_admin

Response: System settings object

#### Update System Settings

```
POST /api/settings/system
```

Permission: super_admin

Request body: Settings to update

Response: Updated settings object

### Email Settings

#### Get Email Settings

```
GET /api/settings/email
```

Permission: super_admin

Response: Email settings object

#### Update Email Settings

```
POST /api/settings/email
```

Permission: super_admin

Request body: Email settings to update

Response: Updated settings object

### SMS Settings

#### Get SMS Settings

```
GET /api/settings/sms
```

Permission: super_admin

Response: SMS settings object

#### Update SMS Settings

```
POST /api/settings/sms
```

Permission: super_admin

Request body: SMS settings to update

Response: Updated settings object

### History / Audit

#### Get All History

```
GET /history
```

Permission: super_admin

Query parameters:
- entity_type: Filter by entity type (ticket, task, user)
- entity_id: Filter by specific entity ID
- user_id: Filter by user who performed the action
- from_date: Start date
- to_date: End date

Response: Array of history entries

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "message": "Error message describing what went wrong",
  "status": 400
}
```

Common error status codes:
- 400: Bad Request - Malformed request or invalid parameters
- 401: Unauthorized - Authentication required
- 403: Forbidden - Insufficient permissions
- 404: Not Found - Resource does not exist
- 500: Internal Server Error - Server-side error

## Pagination

Endpoints that return collections support pagination through query parameters:

- page: Page number (default: 1)
- per_page: Items per page (default: 20, max: 100)

Response format includes pagination metadata:

```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 45,
    "total_pages": 3
  }
}
```

## Rate Limiting

API requests are subject to rate limiting to prevent abuse:

- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated requests

Rate limit headers are included in all responses:
- X-RateLimit-Limit: Max requests per window
- X-RateLimit-Remaining: Remaining requests in current window
- X-RateLimit-Reset: Time when the current window resets 