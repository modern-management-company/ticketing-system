# System Overview

This document provides a high-level overview of the Modern Management Ticketing System architecture and components.

## System Architecture

The Modern Management Ticketing System is built using a modern, scalable architecture with the following key components:

### Frontend Layer
- **Web Application**: React-based single-page application built with Create React App
  - Runs on Node.js during development (default port 3000)
  - Compiled into static files for production
  - Communicates with backend via HTTP REST API calls (JSON)
  - In production, deployed as a static site (e.g., on Vercel)
- **Mobile Applications**: Native iOS and Android applications using React Native
- **Responsive Design**: Adapts to different screen sizes and devices

### API Layer
- **RESTful API**: Flask application (Python) providing JSON-based API endpoints for all ticketing operations
- **API Gateway**: Handles routing, authentication, and rate limiting
- **WebSockets**: Real-time updates for ticket status changes and notifications
- **Authentication**: JWT-based authentication using flask_jwt_extended
- **CORS Support**: Built-in cross-origin request support via flask_cors

### Backend Services
- **Authentication Service**: Manages user authentication and session handling
- **Ticketing Service**: Core business logic for ticket management
  - Creating and managing tickets
  - Auto-assigning tickets to managers based on category-to-department mapping
  - Tracking ticket status and history
- **Notification Service**: Handles email, SMS, and push notifications
  - Email notifications via SMTP (configurable)
  - SMS notifications via Twilio (configurable)
- **Reporting Service**: Generates reports and analytics
- **Integration Service**: Connects with external systems (email, calendar, etc.)

### Database Layer
- **Primary Database**: PostgreSQL for transactional data
  - SQLAlchemy ORM models define the schema
  - Models for User, Property, Room, Ticket, Task, etc.
  - Association tables for PropertyManager, UserProperty, TaskAssignment
- **Search Engine**: Elasticsearch for advanced search capabilities
- **Caching Layer**: Redis for performance optimization

### Storage Layer
- **File Storage**: Supabase storage for ticket attachment files
  - Configured via SUPABASE_URL, SUPABASE_KEY, and SUPABASE_BUCKET_NAME
- **CDN**: Content delivery network for static assets

### Background Scheduler
- **APScheduler**: Handles scheduled background tasks
  - Daily summary jobs (e.g., sending daily report emails to executives)
  - The schedule (e.g., daily at 6PM) is configurable via the EmailSettings table

### Infrastructure
- **Containerization**: Docker for application packaging
- **Orchestration**: Kubernetes for container management
- **Logging**: ELK stack (Elasticsearch, Logstash, Kibana)
- **Monitoring**: Prometheus and Grafana

## Data Flow

1. **User Interface**: Users interact with the system through web or mobile interfaces
2. **API Gateway**: All requests pass through the API gateway for authentication and routing
3. **Backend Services**: Business logic processes the requests
   - Authenticates users via JWT
   - Processes ticket, property, room, and task data
   - Assigns tickets to appropriate managers/staff
   - Sends notifications for important events
4. **Database**: Data is stored and retrieved as needed via SQLAlchemy ORM
5. **Storage**: Files and media are stored in Supabase storage
6. **External Systems**: Integrations with email (SMTP), SMS (Twilio), and other services

## Security Architecture

- **Authentication**: JWT-based authentication with OAuth 2.0 support
  - Token expiry and refresh mechanisms
  - Secure storage of credentials
- **Authorization**: Role-based access control (RBAC) with fine-grained permissions
  - Super Admin: Access to all system features and data
  - Manager: Access to managed properties and related tickets/tasks
  - Staff: Access to assigned properties and tickets
  - Guest/Tenant: Limited access to their own tickets
- **Data Encryption**: TLS for data in transit, encryption for sensitive data at rest
- **API Security**: Rate limiting, input validation, and security headers
- **Audit Logging**: Comprehensive logging of security-relevant events via History model

## Deployment Models

The system supports multiple deployment models:

- **Cloud-Hosted SaaS**: Fully managed service in our cloud environment
  - Frontend on static hosting (Vercel)
  - Backend on PaaS (Render, Heroku)
  - Database as a service
- **Private Cloud**: Dedicated deployment in customer's cloud environment
- **On-Premises**: Traditional installation in customer's data center
- **Hybrid**: Combination of cloud and on-premises components

## Code Structure

The application is organized into two main components:

### Backend (Flask API)
```
backend/
├── app/               # Flask application package
│   ├── __init__.py    # Initialize Flask app, extensions, JWT, CORS
│   ├── models.py      # SQLAlchemy ORM models for all entities
│   ├── routes.py      # All Flask route definitions for the API endpoints
│   ├── services/      # Helper modules for external services
│   │   ├── email_service.py        # Email notifications
│   │   ├── sms_service.py          # SMS via Twilio
│   │   └── supabase_service.py     # File storage
│   └── scheduler.py   # Background job scheduling
├── config.py          # Configuration (reads env variables)
├── requirements.txt   # Python dependencies
└── run.py             # WSGI entry point
```

### Frontend (React App)
```
src/
├── components/        # React components (UI pages and widgets)
├── context/           # React Context providers (for global state)
├── hooks/             # Custom React hooks
├── config/            # Frontend config
├── App.js             # Main React App component
└── index.js           # Entry point for React
```

## API Documentation

The system exposes a comprehensive RESTful API for all operations. Key endpoints include:

### Authentication
- `POST /login` - User login
- `POST /register` - Register a new user
- `GET /verify-token` - Verify JWT token

### Ticket Management
- `GET /tickets` - List tickets accessible to the user
- `POST /tickets` - Create a new support ticket
- `PATCH /tickets/{ticket_id}` - Update ticket status

### Property Management
- `GET /properties` - List properties
- `POST /properties` - Create a new property
- `GET /properties/{property_id}/rooms` - List rooms in a property
- `POST /properties/{property_id}/rooms` - Add a room to a property
- `PUT/PATCH /properties/{property_id}/rooms/{room_id}` - Update room details

### Task Assignment
- `POST /assign-task` - Assign a ticket to a user
- `GET /tasks` - List tasks for the current user

## System Requirements

### Server Requirements
- **CPU**: Minimum 4 cores, recommended 8+ cores
- **Memory**: Minimum 8GB RAM, recommended 16GB+
- **Storage**: Minimum 100GB SSD, scales with usage
- **Network**: 1Gbps network interface, public internet access

### Client Requirements
- **Web Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Devices**: iOS 12+ or Android 8+
- **Internet Connection**: Minimum 2Mbps

## Integration Capabilities

The system provides integration with:

- **Email Systems**: SMTP/IMAP for email processing
- **Calendar Services**: Google Calendar, Microsoft Outlook
- **Authentication Systems**: LDAP, Active Directory, SAML
- **Messaging Platforms**: Twilio for SMS, Slack, Microsoft Teams
- **Property Management Systems**: Various PMS integrations
- **Accounting Software**: QuickBooks, Xero, etc.
- **Storage Services**: Supabase for file storage
- **Custom Integrations**: REST API and webhooks

## Performance Characteristics

- **Response Time**: < 500ms for typical operations
- **Throughput**: Capable of handling 100+ concurrent users per server instance
- **Availability**: 99.9% uptime target (SaaS offering)
- **Recovery Time**: < 1 hour RTO, < 15 minutes RPO

## Backup and Disaster Recovery

- **Database Backups**: Automated daily backups with point-in-time recovery
- **File Backups**: Regular backups of uploaded files and documents
- **Geo-Redundancy**: Multiple region deployment options (SaaS)
- **Failover**: Automated failover capabilities for high availability

## Environment Configuration

The application requires several environment variables for proper configuration:

- **Database**: `DATABASE_URL` - SQLAlchemy database URL
- **Security**: `SECRET_KEY`, `JWT_SECRET_KEY` - Secrets for Flask session and JWT
- **Email**: `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SENDER_EMAIL`
- **Notifications**: `ENABLE_EMAIL_NOTIFICATIONS`, `ENABLE_SMS_NOTIFICATIONS`
- **SMS (Twilio)**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- **File Storage**: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET_NAME` 