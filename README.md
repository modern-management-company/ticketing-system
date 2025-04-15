# Ticketing System
Ticketing system for hotel management
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


# Ticketing System Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [API Documentation](#api-documentation)
3. [Setup and Deployment Instructions](#setup-and-deployment-instructions)
4. [Code Structure and Directory Layout](#code-structure-and-directory-layout)
5. [Contribution Guidelines](#contribution-guidelines)

## System Architecture

### Frontend
- **Technology**: React (Create React App)
- **Deployment**: Static build (e.g., Vercel)
- **Communication**: REST API calls (JSON)

### Backend
- **Framework**: Flask (Python)
- **Database**: PostgreSQL (SQLAlchemy ORM)
- **Security**: JWT (flask_jwt_extended), CORS
- **Storage and Notifications**: Supabase (storage), SMTP (emails), Twilio (SMS)
- **Scheduler**: APScheduler for background tasks

## API Documentation

### Authentication
- **`POST /register`**: Register new user
- **`POST /login`**: User login
- **`GET /verify-token`**: Verify JWT token

### Ticket Management
- **`POST /tickets`**: Create ticket
- **`GET /tickets`**: List tickets

### Property & Room Management
- **`GET /properties`**: List properties
- **`POST /properties`**: Create property
- **`GET /properties/<property_id>/rooms`**: List rooms in property
- **`POST /properties/<property_id>/rooms`**: Create room

### Task Management
- **`POST /assign-task`**: Assign ticket as task
- **`GET /tasks`**: List tasks

## Setup and Deployment Instructions

### Local Development
1. Clone repo: `git clone [repo URL]`
2. Backend setup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://user:password@localhost:5432/db
flask run
```
3. Frontend setup:
```bash
npm install
npm start
```

### Production Deployment
- Deploy backend (e.g., Render)
- Static frontend deployment (e.g., Vercel)

## Code Structure and Directory Layout
```
ticketing-system/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── routes.py
│   │   └── services/
│   ├── config.py
│   ├── requirements.txt
│   ├── run.py
│   ├── setup_db.py
│   └── start.sh
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── App.js
│   └── index.js
├── package.json
└── vercel.json
```

## Contribution Guidelines
- Branch from `develop`, use feature branches
- Commit clear messages
- Follow PEP8 for Python, ESLint for JS
- Write tests for new features
- PR review before merge

---


# Dev Docs
https://docs.google.com/document/d/12zTvpYHkKWjudJcoO7Nb4zcwMY7LSPp1aYEFWqefhaA/edit?usp=sharing
