# API Reference

This document provides a comprehensive reference for developers integrating with the Modern Management Ticketing System API.

## API Overview

The Modern Management Ticketing System offers a RESTful API that allows developers to interact with all aspects of the system programmatically. The API uses standard HTTP methods and returns data in JSON format.

### Base URL
```
https://api.example.com/v1
```

### Authentication

All API requests must be authenticated using one of the following methods:

#### API Keys
Include your API key in the request header:
```
Authorization: Bearer YOUR_API_KEY
```

#### OAuth 2.0
The system supports OAuth 2.0 for more secure integrations. See the [Authentication Guide](#authentication-guide) for details.

### Response Format

All responses are in JSON format with the following structure:

```json
{
  "status": "success",
  "data": {
    // Response data
  },
  "meta": {
    "pagination": {
      "total": 100,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 10,
      "links": {
        "next": "https://api.example.com/v1/tickets?page=2"
      }
    }
  }
}
```

### Error Handling

Errors are returned with appropriate HTTP status codes and a consistent error format:

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "The title field is required.",
    "details": {
      "title": ["The title field is required."]
    }
  }
}
```

### Rate Limiting

API requests are limited to 1000 requests per hour per API key. Rate limit information is included in the response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1605170130
```

## Endpoints

### Tickets

#### List Tickets

```
GET /tickets
```

Query Parameters:
- `status` - Filter by ticket status (open, in_progress, closed)
- `priority` - Filter by priority (low, medium, high, critical)
- `assigned_to` - Filter by assigned user ID
- `property_id` - Filter by property ID
- `page` - Page number for pagination
- `per_page` - Items per page (default: 10, max: 100)
- `sort` - Sort field (created_at, updated_at, priority)
- `order` - Sort order (asc, desc)

Response:
```json
{
  "status": "success",
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Water leak in bathroom",
      "description": "There is water leaking from the ceiling in the bathroom",
      "status": "open",
      "priority": "high",
      "category": "plumbing",
      "created_at": "2023-01-15T15:30:00Z",
      "updated_at": "2023-01-15T15:30:00Z",
      "property": {
        "id": "abc123",
        "name": "Seaside Apartments"
      },
      "unit": {
        "id": "unit456",
        "name": "Unit 101"
      },
      "requester": {
        "id": "user789",
        "name": "John Doe"
      },
      "assigned_to": {
        "id": "user101",
        "name": "Jane Smith"
      }
    }
    // More tickets...
  ],
  "meta": {
    "pagination": {
      "total": 100,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 10,
      "links": {
        "next": "https://api.example.com/v1/tickets?page=2"
      }
    }
  }
}
```

#### Get Ticket

```
GET /tickets/{ticket_id}
```

Response:
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Water leak in bathroom",
    "description": "There is water leaking from the ceiling in the bathroom",
    "status": "open",
    "priority": "high",
    "category": "plumbing",
    "created_at": "2023-01-15T15:30:00Z",
    "updated_at": "2023-01-15T15:30:00Z",
    "property": {
      "id": "abc123",
      "name": "Seaside Apartments"
    },
    "unit": {
      "id": "unit456",
      "name": "Unit 101"
    },
    "requester": {
      "id": "user789",
      "name": "John Doe"
    },
    "assigned_to": {
      "id": "user101",
      "name": "Jane Smith"
    },
    "attachments": [
      {
        "id": "attach123",
        "filename": "leak.jpg",
        "url": "https://example.com/files/leak.jpg",
        "size": 1024000,
        "content_type": "image/jpeg",
        "created_at": "2023-01-15T15:30:00Z"
      }
    ],
    "comments": [
      {
        "id": "comment123",
        "text": "I'll check this out this afternoon.",
        "user": {
          "id": "user101",
          "name": "Jane Smith"
        },
        "created_at": "2023-01-15T16:00:00Z"
      }
    ]
  }
}
```

#### Create Ticket

```
POST /tickets
```

Request Body:
```json
{
  "title": "Water leak in bathroom",
  "description": "There is water leaking from the ceiling in the bathroom",
  "priority": "high",
  "category": "plumbing",
  "property_id": "abc123",
  "unit_id": "unit456"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Water leak in bathroom",
    "description": "There is water leaking from the ceiling in the bathroom",
    "status": "open",
    "priority": "high",
    "category": "plumbing",
    "created_at": "2023-01-15T15:30:00Z",
    "updated_at": "2023-01-15T15:30:00Z",
    "property": {
      "id": "abc123",
      "name": "Seaside Apartments"
    },
    "unit": {
      "id": "unit456",
      "name": "Unit 101"
    },
    "requester": {
      "id": "user789",
      "name": "John Doe"
    }
  }
}
```

#### Update Ticket

```
PATCH /tickets/{ticket_id}
```

Request Body:
```json
{
  "status": "in_progress",
  "assigned_to": "user101"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Water leak in bathroom",
    "description": "There is water leaking from the ceiling in the bathroom",
    "status": "in_progress",
    "priority": "high",
    "category": "plumbing",
    "created_at": "2023-01-15T15:30:00Z",
    "updated_at": "2023-01-15T16:30:00Z",
    "property": {
      "id": "abc123",
      "name": "Seaside Apartments"
    },
    "unit": {
      "id": "unit456",
      "name": "Unit 101"
    },
    "requester": {
      "id": "user789",
      "name": "John Doe"
    },
    "assigned_to": {
      "id": "user101",
      "name": "Jane Smith"
    }
  }
}
```

#### Delete Ticket

```
DELETE /tickets/{ticket_id}
```

Response:
```json
{
  "status": "success",
  "data": null
}
```

### Users

#### List Users

```
GET /users
```

Query Parameters:
- `role` - Filter by user role (admin, manager, staff, guest)
- `property_id` - Filter by property ID (for assigned users)
- `page` - Page number for pagination
- `per_page` - Items per page (default: 10, max: 100)

Response:
```json
{
  "status": "success",
  "data": [
    {
      "id": "user101",
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "role": "staff",
      "created_at": "2022-12-01T10:00:00Z",
      "properties": [
        {
          "id": "abc123",
          "name": "Seaside Apartments"
        }
      ]
    }
    // More users...
  ],
  "meta": {
    "pagination": {
      "total": 50,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 5,
      "links": {
        "next": "https://api.example.com/v1/users?page=2"
      }
    }
  }
}
```

#### Get User

```
GET /users/{user_id}
```

Response:
```json
{
  "status": "success",
  "data": {
    "id": "user101",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "555-123-4567",
    "role": "staff",
    "created_at": "2022-12-01T10:00:00Z",
    "updated_at": "2023-01-15T16:30:00Z",
    "properties": [
      {
        "id": "abc123",
        "name": "Seaside Apartments"
      }
    ],
    "preferences": {
      "notifications": {
        "email": true,
        "sms": false
      }
    }
  }
}
```

### Properties

#### List Properties

```
GET /properties
```

Query Parameters:
- `page` - Page number for pagination
- `per_page` - Items per page (default: 10, max: 100)

Response:
```json
{
  "status": "success",
  "data": [
    {
      "id": "abc123",
      "name": "Seaside Apartments",
      "address": {
        "street": "123 Ocean Drive",
        "city": "Beachtown",
        "state": "CA",
        "zip": "90210",
        "country": "USA"
      },
      "units_count": 50,
      "active_tickets_count": 12
    }
    // More properties...
  ],
  "meta": {
    "pagination": {
      "total": 20,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 2,
      "links": {
        "next": "https://api.example.com/v1/properties?page=2"
      }
    }
  }
}
```

## Webhooks

The system can send webhook notifications for various events. To set up webhooks:

```
POST /webhooks
```

Request Body:
```json
{
  "url": "https://your-server.com/webhook-endpoint",
  "events": ["ticket.created", "ticket.updated", "ticket.resolved"],
  "secret": "your_webhook_secret"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "id": "webhook123",
    "url": "https://your-server.com/webhook-endpoint",
    "events": ["ticket.created", "ticket.updated", "ticket.resolved"],
    "created_at": "2023-01-15T15:30:00Z"
  }
}
```

### Webhook Payload

Webhook payloads follow this format:

```json
{
  "event": "ticket.created",
  "timestamp": "2023-01-15T15:30:00Z",
  "data": {
    // Event-specific data
  }
}
```

## Authentication Guide

### Generating API Keys

API keys can be generated in the admin panel:

1. Navigate to Settings > API Keys
2. Click "Generate New API Key"
3. Set permissions and expiration date
4. Copy the API key (shown only once)

### OAuth 2.0 Integration

For OAuth 2.0 integration, use the following endpoints:

```
Authorization URL: https://api.example.com/oauth/authorize
Token URL: https://api.example.com/oauth/token
```

Parameters:
- `client_id` - Your client ID
- `client_secret` - Your client secret
- `redirect_uri` - Your redirect URI
- `scope` - API scopes (space-separated)

#### Available Scopes
- `tickets:read` - Read ticket data
- `tickets:write` - Create and update tickets
- `users:read` - Read user data
- `properties:read` - Read property data

## Pagination

All list endpoints support pagination with the following query parameters:

- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 10, max: 100)

## Versioning

The API uses URI versioning (e.g., `/v1/tickets`). Major versions will be incremented for breaking changes.

## Rate Limiting

The API has the following rate limits:

- 1000 requests per hour for standard API keys
- 5000 requests per hour for premium API keys

When a rate limit is exceeded, the API will return a 429 Too Many Requests response. 