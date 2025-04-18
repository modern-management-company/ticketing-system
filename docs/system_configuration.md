# System Configuration Guide

This guide provides detailed information about configuring the system through the System Console, which is accessible only to Super Admins.

## Accessing the System Console

1. Log in with a Super Admin account
2. Navigate to the Management Console
3. Click "System Console" in the sidebar navigation
4. You will be redirected to the System Console interface (dark header)

## System Settings

The System Settings section allows configuration of global system parameters.

### General Settings

1. Navigate to System Console > System Settings
2. Configure the following options:
   - **System Name**: The name displayed in the header and notifications
   - **Default Language**: Primary language for the system
   - **Time Zone**: System-wide time zone setting
   - **Date Format**: How dates are displayed throughout the system
   - **Time Format**: 12-hour or 24-hour time display
   - **Currency Symbol**: For cost reporting
   - **Default Pagination**: Number of items per page in lists

### Security Settings

In the Security tab of System Settings:

1. Configure password policies:
   - **Minimum Length**: Recommended 8+ characters
   - **Complexity Requirements**: Require mixed case, numbers, symbols
   - **Password Expiration**: Number of days before password reset
   - **Failed Login Attempts**: Number before account lockout
   
2. Session settings:
   - **Token Lifetime**: How long authentication tokens remain valid
   - **Session Timeout**: Inactive time before automatic logout
   - **Remember Me Duration**: How long "remember me" cookies last

### Branding

In the Branding tab:

1. Upload organization logo (recommended 250×75 pixels)
2. Set primary and secondary theme colors
3. Customize login page message
4. Configure system-wide footer text

## History/Audit Logs

The History section provides access to all system actions for auditing and troubleshooting.

### Viewing History

1. Navigate to System Console > History
2. Use filters to narrow results:
   - **Entity Type**: Filter by ticket, task, user, property, etc.
   - **Action Type**: Created, updated, deleted, etc.
   - **User**: Who performed the action
   - **Date Range**: When actions occurred
   
3. Export history to CSV or PDF for record-keeping

### Retention Settings

Configure how long history records are kept:

1. Navigate to History > Settings
2. Set retention periods:
   - **General Actions**: Standard actions (default: 12 months)
   - **Security Events**: Login attempts, permission changes (default: 24 months)
   - **Data Modifications**: Changes to core data (default: 36 months)

## Email Configuration

Email settings control system notifications and communications.

### SMTP Settings

1. Navigate to System Console > Email Settings
2. Configure the following:
   - **SMTP Server**: Your mail server address
   - **SMTP Port**: Usually 587 (TLS) or 465 (SSL)
   - **Username**: SMTP authentication username
   - **Password**: SMTP authentication password
   - **Sender Email**: The "From" address
   - **Sender Name**: Name displayed to recipients

3. Click "Test Connection" to verify settings

### Email Templates

Customize notification emails:

1. Navigate to Email Settings > Templates
2. Select a template to edit:
   - **Welcome Email**: Sent to new users
   - **Password Reset**: For password recovery
   - **Ticket Created**: Notification of new tickets
   - **Task Assigned**: Notification of task assignment
   - **Daily Digest**: Summary of activities
   
3. Customize subject and body using available variables
4. Preview the template before saving
5. Reset to default if needed

### Email Scheduling

Configure automated email reports:

1. Navigate to Email Settings > Scheduling
2. Set up scheduled reports:
   - **Daily Summary**: Activity overview
   - **Weekly Performance**: Task completion metrics
   - **Monthly Analysis**: Trend reporting
3. Configure recipients, timing, and content

## SMS Configuration

The SMS settings allow integration with text message notification services.

### SMS Provider

1. Navigate to System Console > SMS Settings
2. Select your SMS provider:
   - Twilio
   - AWS SNS
   - MessageBird
   - Others as available
   
3. Enter provider-specific credentials:
   - **API Key/Account SID**: Provider authentication
   - **API Secret/Auth Token**: Provider authentication
   - **Sender Phone Number**: Number messages will come from

4. Click "Test Configuration" to verify

### SMS Templates

Customize SMS notification messages:

1. Navigate to SMS Settings > Templates
2. Edit templates for various notifications:
   - **Urgent Ticket**: For high-priority tickets
   - **Task Assignment**: Brief assignment notice
   - **Completion Reminder**: For approaching deadlines
   
3. Remember SMS messages should be concise (160 characters recommended)

## Attachment Settings

Configure how the system handles file attachments.

### Storage Configuration

1. Navigate to System Console > Attachment Settings
2. Choose storage type:
   - **Local Storage**: Files stored on the server
   - **Amazon S3**: Cloud storage with AWS
   - **Azure Blob Storage**: Microsoft cloud storage
   - **Google Cloud Storage**: Google cloud storage

3. Configure provider-specific settings:
   - **Bucket/Container Name**: Where files are stored
   - **Region**: Geographic location of storage
   - **Access Credentials**: Authentication details

### File Settings

Configure file handling rules:

1. Set file limitations:
   - **Maximum File Size**: Limit in MB (default: 16MB)
   - **Allowed Extensions**: File types permitted (.pdf, .jpg, etc.)
   
2. Configure image processing:
   - **Image Resize**: Automatic resizing of uploaded images
   - **Thumbnail Generation**: Create thumbnails for gallery views

## Best Practices

### Security Recommendations

- Regularly review and update security settings
- Implement strong password policies
- Rotate SMTP and SMS credentials periodically
- Review history logs for unusual activity

### Performance Optimization

- Keep attachment size limits reasonable
- Configure appropriate retention periods for history logs
- Schedule email reports during off-peak hours
- Monitor system performance after configuration changes

### Backup Configuration

Always create a backup before making significant changes:

1. Navigate to System Console > System Settings > Backup
2. Click "Export Configuration"
3. Store the configuration file securely
4. Use "Import Configuration" to restore if needed 