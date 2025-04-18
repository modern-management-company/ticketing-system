# Super Admin User Guide

This comprehensive guide covers all aspects of the Super Admin role within the Modern Management Ticketing System, including detailed instructions for using each feature and component.

## Role Overview

As a Super Admin, you have full access to all system features, including:
- Complete user management
- Property administration
- System-wide configuration
- Email and SMS settings
- Audit history and logs
- Attachment settings

## Navigation Overview

As a Super Admin, you have access to three main interfaces:

1. **Main Application**: Day-to-day operations
2. **Management Console**: Property and user administration
3. **System Console**: System-wide configuration

## Main Application Components

### Dashboard

The Dashboard provides a system-wide overview of all activities.

**Key Features**:
- **Activity Summary**: Shows ticket and task statistics across all properties
- **Performance Metrics**: Response times, completion rates, and workload distribution
- **Alert Panel**: High-priority items requiring attention

**How to Use**:
1. View the KPI cards at the top for critical metrics
2. Check the "Recent Activity" section for the latest system events
3. Use the "Quick Actions" panel for common operations

### Tickets Management

As a Super Admin, you can view and manage tickets across all properties.

**Key Features**:
- **Global Ticket View**: See tickets from all properties
- **Advanced Filtering**: Filter by any combination of properties, status, priority, etc.
- **Bulk Operations**: Perform actions on multiple tickets simultaneously

**How to Use**:
1. Navigate to "Tickets" in the main navigation
2. Use the filter panel to narrow down results
3. Click on a ticket to view details
4. Use the "Actions" dropdown for operations like reassignment, priority changes, etc.

### Task Management

Manage tasks across the entire system.

**Key Features**:
- **Global Task View**: See all tasks in the system
- **Resource Allocation**: Monitor staff workloads across properties
- **Performance Tracking**: Track completion metrics

**How to Use**:
1. Navigate to "Tasks" in the main navigation
2. Use the "Group By" feature to organize tasks by property, assignee, etc.
3. Use the "Workload View" to see task distribution among staff

### Reports

Access comprehensive reporting features.

**Key Features**:
- **System-wide Reports**: Generate reports across all properties
- **Custom Report Builder**: Create tailored reports with specific metrics
- **Scheduled Reports**: Configure automated report generation

**How to Use**:
1. Navigate to "Reports" in the main navigation
2. Select from pre-configured report templates or create a custom report
3. Use the export options (PDF, CSV, Excel) to download reports
4. Set up scheduled reports using the "Schedule" button

## Management Console Components

### Property Management

Manage all properties in the system.

**Key Features**:
- **Property Creation/Editing**: Add new properties or modify existing ones
- **Bulk Property Operations**: Update multiple properties simultaneously
- **Property Assignment**: Assign properties to managers and general managers

**Step-by-Step Guide**:
1. Navigate to the Management Console
2. Select "Properties" from the sidebar
3. To add a new property:
   - Click "Add Property"
   - Fill in required details (name, address, type, etc.)
   - Click "Save"
4. To edit a property:
   - Click the edit icon next to the property
   - Modify details as needed
   - Click "Save"
5. To assign managers:
   - Select a property
   - Click "Manage Assignments"
   - Select managers from the user list
   - Click "Save Assignments"

### User Management

Comprehensive user administration.

**Key Features**:
- **User Creation/Editing**: Add new users or modify existing ones
- **Role Assignment**: Assign appropriate roles (User, Manager, General Manager)
- **Property Assignment**: Connect users to relevant properties
- **Account Management**: Reset passwords, deactivate accounts, etc.

**Step-by-Step Guide**:
1. Navigate to the Management Console
2. Select "Users" from the sidebar
3. To add a new user:
   - Click "Add User"
   - Fill in required details (username, email, password, etc.)
   - Select the appropriate role
   - Assign properties if relevant
   - Click "Save"
4. To edit a user:
   - Click the edit icon next to the user
   - Modify details as needed
   - Click "Save"
5. To reset a password:
   - Click the reset password icon next to the user
   - Enter the new password
   - Enable "Send password via email" if needed
   - Click "Change Password"

## System Console Components

### System Settings

Configure global system parameters.

**Key Features**:
- **General Settings**: System name, language, time zone, etc.
- **Security Settings**: Password policies, session timeouts, etc.
- **Branding**: Logo, colors, and themes

**Step-by-Step Guide**:
1. Navigate to the System Console
2. Select "System Settings" from the sidebar
3. Navigate between tabs (General, Security, Branding)
4. Make desired changes
5. Click "Save" in each section

### History/Audit Logs

Review system activities for security and troubleshooting.

**Key Features**:
- **Advanced Filtering**: Search by user, action type, date, etc.
- **Detailed Activity View**: See exactly what changed in each action
- **Export Options**: Download logs for external analysis

**Step-by-Step Guide**:
1. Navigate to the System Console
2. Select "History" from the sidebar
3. Use the filter panel to narrow down results
4. Click on an entry to view details
5. Use the "Export" button to download logs

### Email Settings

Configure system email functionality.

**Key Features**:
- **SMTP Configuration**: Set up email server connections
- **Template Management**: Customize email notifications
- **Schedule Configuration**: Set up automated emails

**Step-by-Step Guide**:
1. Navigate to the System Console
2. Select "Email Settings" from the sidebar
3. Configure SMTP details on the main tab
4. Select "Templates" to customize notification emails
5. Use "Scheduling" to set up automated reports

### SMS Settings

Configure text message notifications.

**Key Features**:
- **Provider Configuration**: Set up SMS gateway connections
- **Template Management**: Customize SMS messages
- **Notification Rules**: Define when SMS alerts are sent

**Step-by-Step Guide**:
1. Navigate to the System Console
2. Select "SMS Settings" from the sidebar
3. Choose and configure your SMS provider
4. Customize templates in the "Templates" tab
5. Set up notification rules in the "Rules" tab

### Attachment Settings

Configure file handling and storage.

**Key Features**:
- **Storage Configuration**: Choose and set up storage locations
- **File Limitations**: Set size limits and allowed file types
- **Image Processing**: Configure automatic image handling

**Step-by-Step Guide**:
1. Navigate to the System Console
2. Select "Attachment Settings" from the sidebar
3. Choose your storage provider
4. Configure storage-specific settings
5. Set file limitations and processing options

## Advanced Administration Tasks

### System Backup and Restore

**How to Create a System Backup**:
1. Navigate to System Console > System Settings > Backup
2. Click "Create Backup"
3. Choose backup options (full or configuration only)
4. Click "Start Backup"
5. Download the backup file when complete

**How to Restore from Backup**:
1. Navigate to System Console > System Settings > Backup
2. Click "Restore Backup"
3. Upload your backup file
4. Select restoration options
5. Click "Start Restore"

### User Bulk Operations

**How to Perform Bulk User Updates**:
1. Navigate to Management Console > Users
2. Use checkboxes to select multiple users
3. Click "Bulk Actions"
4. Choose the operation (change role, assign properties, etc.)
5. Configure operation details
6. Click "Apply"

### Custom Role Configuration

While the system has predefined roles, Super Admins can fine-tune permissions:

1. Navigate to System Console > System Settings > Roles
2. Select a role to modify
3. Adjust permission checkboxes
4. Click "Save Changes"

## Best Practices for Super Admins

1. **Regular Security Audits**:
   - Review user accounts monthly
   - Check history logs for suspicious activity
   - Ensure password policies are enforced

2. **System Maintenance**:
   - Schedule regular database maintenance
   - Archive old tickets and tasks
   - Review and optimize system settings

3. **User Administration**:
   - Enforce the principle of least privilege
   - Regularly review user roles and permissions
   - Document role assignments and changes

4. **Data Management**:
   - Configure appropriate retention policies
   - Ensure regular backups are taken
   - Test restoration procedures periodically

## Troubleshooting Common Issues

### User Access Problems
- Check user role assignments
- Verify property assignments
- Review account status (active/inactive)
- Check for recent password changes

### Email Notification Issues
- Verify SMTP settings
- Check for template errors
- Ensure email addresses are valid
- Review spam filter settings

### Performance Concerns
- Analyze database query performance
- Check attachment storage usage
- Review scheduled job configurations
- Monitor system resource usage 