# Installation Guide

This guide provides step-by-step instructions for setting up and configuring the Modern Management Ticketing System.

## Prerequisites

Before beginning installation, ensure you have the following:

### System Requirements

- **Operating System**: Linux (recommended), macOS, or Windows
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: Minimum 20GB free disk space
- **Database**: PostgreSQL 12+ (recommended) or MySQL 8+

### Software Dependencies

- **Node.js**: v16.x or higher
- **npm**: v7.x or higher
- **Python**: v3.9 or higher
- **pip**: Latest version
- **Git**: Latest version

## Backend Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ticketing-system-dev.git
cd ticketing-system-dev
```

### 2. Set Up Backend Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```
SECRET_KEY=your_secret_key_here
DATABASE_URL=postgresql://username:password@localhost/ticketing_db
JWT_SECRET_KEY=your_jwt_secret_key
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_email@example.com
SMTP_PASSWORD=your_email_password
SENDER_EMAIL=noreply@example.com
```

### 4. Initialize Database

```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### 5. Create Initial Admin User

```bash
flask create-admin --username admin --password secure_password --email admin@example.com
```

## Frontend Installation

### 1. Set Up Frontend Environment

```bash
cd ../frontend
npm install
```

### 2. Configure Frontend Environment

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:5000
```

## Running the Application

### Development Mode

#### Start Backend Server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
flask run --debug
```

#### Start Frontend Server

```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

### Production Deployment

#### Backend Setup

1. Configure a production WSGI server (e.g., Gunicorn):

```bash
cd backend
pip install gunicorn
gunicorn --bind 0.0.0.0:5000 wsgi:app
```

2. Set up a reverse proxy with Nginx or Apache

#### Frontend Build

```bash
cd frontend
npm run build
```

Deploy the generated content in the `build` directory to your web server.

## Database Migration

To update the database schema after model changes:

```bash
cd backend
flask db migrate -m "Description of changes"
flask db upgrade
```

## Adding General Manager Role

To enable the General Manager role, run the migration:

```bash
cd backend
flask db migrate -m "Add general manager role"
```

## System Configuration

### Email Configuration

1. Navigate to System Console > Email Settings
2. Enter your SMTP server details
3. Test the configuration using the Test Email function

### SMS Configuration

1. Navigate to System Console > SMS Settings
2. Enter your SMS gateway provider details
3. Configure the sender phone number
4. Test the configuration

### Attachment Settings

1. Navigate to System Console > Attachment Settings
2. Configure storage location (local or cloud)
3. Set file size limits and allowed extensions

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database credentials
   - Ensure database server is running
   - Check network connectivity

2. **Email Sending Failures**
   - Verify SMTP credentials
   - Check for firewall or network restrictions
   - Test SMTP server connectivity

3. **JWT Authentication Issues**
   - Ensure JWT_SECRET_KEY is properly set
   - Check for clock synchronization issues
   - Verify token expiration settings

### Logs

- Backend logs: `backend/logs/app.log`
- Database migration logs: `backend/migrations/logs/`
- Frontend build logs: Available in the console during `npm build`

## Support

For additional help:

- Create an issue on GitHub
- Contact system administration
- Refer to the API documentation at `/api/docs` when the server is running 