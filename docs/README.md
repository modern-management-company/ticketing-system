# Ticketing System Documentation

This directory contains documentation for the Modern Management Ticketing System.

## Available Documentation

- [Admin Guide](user_guides/admin_guide.md) - Comprehensive guide for system administrators
- [User Guide](user_guides/user_guide.md) - Guide for end users of the ticketing system

## Building the HTML Documentation

To build the HTML version of the documentation:

1. Install dependencies:
   ```
   npm install
   ```

2. Build the documentation:
   ```
   npm run build
   ```

3. Serve the documentation locally:
   ```
   npm run serve
   ```

4. Open your browser and navigate to `http://localhost:3001/user_guides_html/`

The HTML documentation will be generated in the `user_guides_html` directory.

## Development

To add new documentation:

1. Create a new Markdown file in the `user_guides` directory
2. Run the build script to generate the HTML version
3. The new document will automatically be added to the navigation

## Documentation Standards

- Use Markdown syntax for all documentation files
- Include a clear title at the top of each document
- Use headings (H1, H2, H3) to create a logical document structure
- Include code examples where appropriate using code blocks

## Documentation Structure

- `user_guides/` - Contains user guides in Markdown format
  - `admin_guide.md` - Administrator Guide 
  - (other guides)
- `convert_md_to_html.js` - Script to convert Markdown to HTML
- `package.json` - NPM configuration and dependencies

Welcome to the documentation for the Modern Management Ticketing System. This comprehensive guide will help you understand, install, and use the system effectively.

## Table of Contents

### Getting Started
- [System Overview](./system_overview.md) - Architectural overview and system design
- [Installation Guide](./installation.md) - Step-by-step setup instructions
- [Quick Start Guide](./quick_start.md) - Get up and running quickly

### User Documentation
- [User Roles and Permissions](./user_roles.md) - Understanding access levels and capabilities
- [Console Interfaces Guide](./consoles_guide.md) - Navigation and interface explanation
- [General Manager Role](./general_manager.md) - Special documentation for the General Manager role

### Administrative Documentation
- [Property Management](./property_management.md) - Managing properties and rooms
- [User Management](./user_management.md) - Creating and managing user accounts
- [System Configuration](./system_configuration.md) - Configuring system-wide settings

### Developer Resources
- [API Reference](./api_reference.md) - Complete API documentation
- [Database Schema](./database_schema.md) - Database structure and relationships
- [Frontend Architecture](./frontend_architecture.md) - React component hierarchy and state management

### Operations
- [Backup and Recovery](./backup_recovery.md) - Data protection strategies
- [Monitoring](./monitoring.md) - System health and performance monitoring
- [Scaling Guide](./scaling.md) - Handling increased load and users

## About the System

The Modern Management Ticketing System is designed to help property managers track and resolve maintenance issues, service requests, and other tasks across multiple properties. The system features a hierarchical role-based access control system, property assignments, and specialized interfaces for different user types.

## Key Features

- **User Management**: Comprehensive role-based access control
- **Property Management**: Organize rooms and assets by property
- **Ticket Tracking**: Create, assign, and resolve maintenance tickets
- **Task Management**: Convert tickets to assignable tasks
- **Service Requests**: Handle guest and tenant service needs
- **Reporting**: Generate insights and performance metrics
- **Notifications**: Email and SMS alerts for updates
- **Mobile-Friendly**: Responsive design for field staff

## Support and Feedback

For support issues or to provide feedback, please contact the system administrator or create an issue in the GitHub repository.

## License

This software is licensed under [Your License]. See the LICENSE file for details. 