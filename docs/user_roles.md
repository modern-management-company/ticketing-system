# User Roles and Permissions

## Role Overview

The Modern Management Ticketing System implements a hierarchical role-based access control system with four primary roles:

1. **Super Admin**
2. **General Manager**
3. **Manager**
4. **User**

Each role has specific permissions and access levels within the application, aligned with their responsibilities.

## Role Details

### Super Admin

The Super Admin has full access to all system functionality and serves as the overall system administrator.

**Permissions:**
- Full access to all properties in the system
- User management (create, edit, delete) for all users
- System-wide configuration via the System Console
- Access to audit history and logs
- Email and SMS configuration
- Attachment and storage settings
- Property management
- Complete access to reports and statistics
- Can create and manage users of any role except additional super admins

**Console Access:**
- Main Application
- Management Console
- System Console

### General Manager

The General Manager oversees multiple properties and the managers assigned to them, serving as a middle-tier administrator.

**Permissions:**
- Access to all properties they are assigned to manage
- View and manage users assigned to their managed properties
- Create and manage managers for their properties
- Create and manage regular users
- Reset passwords for users assigned to their properties
- Manage property details and rooms
- View reports for all managed properties

**Console Access:**
- Main Application
- Management Console

### Manager

Managers are responsible for a specific property and the users assigned to it.

**Permissions:**
- Access to the specific properties they are assigned to manage
- Create and manage regular users for their property
- Manage details about their assigned property and rooms
- Assign tasks to users within their property
- View and respond to tickets for their property
- Access to property-specific reports

**Console Access:**
- Main Application
- Management Console (limited to property management)

### User

Regular users are the base level and typically represent service staff or maintenance personnel.

**Permissions:**
- View and create tickets
- View and complete assigned tasks
- Access rooms they are responsible for
- Submit service requests
- Update the status of their assigned tasks

**Console Access:**
- Main Application only

## Property Assignment and Hierarchy

The system manages access through property assignments:

1. **Property Assignments:**
   - Users are assigned to specific properties
   - Managers are assigned to manage specific properties
   - General Managers are assigned to oversee multiple properties
   - Super Admins have access to all properties

2. **User-Manager Relationship:**
   - Users can have a direct manager
   - Managers can have multiple team members
   - General Managers oversee multiple managers

## Role Assignment and Management

Role assignment follows specific rules:

1. **Role Promotion/Demotion:**
   - Super Admins can change any user's role
   - General Managers can promote users to managers
   - When promoting a user to manager/general manager, their property assignments are maintained

2. **Tools for Role Management:**
   - Web Interface: User management screens in the Management Console
   - Command-line Tools: Scripts for bulk operations and special cases

## Access Control Implementation

Access control is enforced at multiple levels:

1. **Frontend Routes:**
   - Protected routes check user roles before rendering
   - Unauthorized access redirects to an error page

2. **API Endpoints:**
   - JWT tokens contain role information
   - Middleware validates appropriate role access for each endpoint
   - Property-based filtering ensures users only see appropriate data

3. **Database Queries:**
   - Queries are filtered based on user role and property assignments
   - Super Admins receive unfiltered data
   - Other roles receive data scoped to their permissions 