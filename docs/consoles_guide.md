# Console Interfaces Guide

## Overview

The Modern Management Ticketing System provides three distinct interface environments, each tailored to specific user roles and functions:

1. **Main Application**: The primary interface for day-to-day operations
2. **Management Console**: For property and user management
3. **System Console**: For system-wide administration (Super Admins only)

This guide explains how to navigate and utilize each console effectively.

## Main Application

The Main Application is accessible to all authenticated users and serves as the primary workspace for ticket management, task completion, and daily operations.

### Access

- Available to all authenticated users
- Default landing page after login
- Accessible via the main navigation menu

### Key Features

1. **Dashboard**
   - Overview of tickets, tasks, and performance metrics
   - Quick access to common functions
   - Personalized task list and notifications

2. **Tickets Management**
   - Create, view, and update tickets
   - Filter and search functionality
   - Attachment support for documentation

3. **Tasks List**
   - View assigned tasks
   - Update task status and progress
   - Log completion time and details

4. **Rooms View**
   - Browse rooms by property
   - View room details and status
   - Create tickets for specific rooms

5. **Service Requests**
   - Submit and track service requests
   - Manage guest amenity requests
   - Schedule routine services

6. **Reports** (Managers and above)
   - View performance metrics
   - Generate customized reports
   - Export data for analysis

### Navigation

The main navigation menu provides access to all sections. A responsive design adapts to both desktop and mobile devices with a collapsible sidebar for smaller screens.

## Management Console

The Management Console provides administrative functions for managing properties and users. It's designed for property managers, general managers, and system administrators.

### Access

- Available to users with 'manager', 'general_manager', or 'super_admin' roles
- Accessible via the navigation menu or by clicking "Management Console" in the main interface
- Direct URL: `/manage`

### Key Features

1. **Properties Management**
   - Create and edit properties
   - Manage rooms within properties
   - Configure property settings and details
   - Available to all managers and above

2. **User Management**
   - Create, edit, and deactivate user accounts
   - Assign users to properties
   - Manage roles and permissions
   - Reset user passwords
   - Available to general managers and super admins only

### Visual Distinction

The Management Console features a distinct color scheme and header to visually differentiate it from the main application.

### Navigation

- The left sidebar provides access to different management functions
- Super Admins will see a "System Console" link at the bottom of the sidebar
- All users will see a "Back to Main App" link to return to the main interface

## System Console

The System Console provides system-wide administration tools exclusively for Super Admins.

### Access

- Available only to users with the 'super_admin' role
- Accessible via the "System Console" link in the Management Console
- Direct URL: `/system`

### Key Features

1. **System Settings**
   - Configure global system parameters
   - Manage default values and behavior
   - Customize system appearance and branding

2. **History/Audit Logs**
   - View system-wide activity logs
   - Audit user actions and changes
   - Search and filter historical data

3. **Email Settings**
   - Configure email server settings
   - Manage notification templates
   - Test email functionality

4. **SMS Settings**
   - Configure SMS provider integration
   - Manage SMS notification rules
   - Test SMS functionality

5. **Attachment Settings**
   - Configure file storage settings
   - Set file size limits and allowed types
   - Choose between local or cloud storage

### Visual Distinction

The System Console features a darker color scheme in the header to clearly distinguish it from other interfaces, highlighting its administrative nature.

### Navigation

- The left sidebar provides access to different system administration functions
- A "Management Console" link allows quick access back to the Management Console
- A "Back to Main App" link returns to the main interface

## Switching Between Consoles

### For Super Admins

Super Admins can freely navigate between all three interfaces:

1. **From Main App to Management Console**: Click "Management Console" in the navigation menu
2. **From Management Console to System Console**: Click "System Console" in the sidebar
3. **From System Console to Management Console**: Click "Management Console" in the sidebar
4. **Return to Main App**: Click "Back to Main App" in any console's sidebar

### For General Managers and Managers

General Managers and Managers can navigate between two interfaces:

1. **From Main App to Management Console**: Click "Management Console" in the navigation menu
2. **Return to Main App**: Click "Back to Main App" in the Management Console sidebar

### For Regular Users

Regular users have access only to the Main Application and cannot access either console.

## Best Practices

1. **Use the Right Tool**: Choose the appropriate console for your task
   - Day-to-day operations: Main Application
   - Property/user administration: Management Console
   - System configuration: System Console

2. **Security Awareness**: Remember that higher-level consoles contain sensitive administration features
   - Always log out when leaving your workstation
   - Be cautious when making system-wide changes

3. **Efficient Navigation**: Use the sidebar links to move between consoles rather than the browser's back button
   - This ensures proper state management
   - Prevents potential session issues 