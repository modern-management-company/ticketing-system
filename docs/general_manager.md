# General Manager Role

## Overview

The General Manager role is a new role positioned between regular Property Managers and the Super Admin. General Managers have broader access and permissions than regular managers but fewer than super admins, allowing them to oversee multiple properties and their respective managers.

## Permissions

General Managers can:

1. View and manage users assigned to their managed properties
2. View and manage managers assigned to their managed properties
3. Manage all properties they have been assigned to
4. Reset passwords for users that are assigned to their managed properties
5. Create new regular users and managers
6. Access and view reports for all their managed properties

## Console Access

The system provides two separate consoles:

1. **Management Console**: Accessible by managers, general managers, and super admins. Includes property and user management.
2. **System Console**: Accessible only by super admins. Contains system-wide settings, history, email configuration, SMS configuration, and attachment settings.

General Managers have enhanced privileges in the Management Console but cannot access the System Console.

## Hierarchy of Roles

From highest to lowest permission level:

1. **Super Admin**: Can access and manage everything in the system, including both Management and System Consoles
2. **General Manager**: Can manage multiple properties and their managers through the Management Console
3. **Manager**: Can manage a specific property and its users through the Management Console
4. **User**: Basic access to create tickets and perform assigned tasks

## How to Promote a User to General Manager

There are two ways to make a user a General Manager:

### Option 1: Using the Admin Interface

1. Log in as a Super Admin
2. Navigate to "Management Console" > "Users"
3. Find the user you want to promote
4. Change their role from the dropdown menu to "general_manager"
5. Save the changes

### Option 2: Using the Promotion Script

A script is available to promote existing managers to general managers:

```bash
cd backend
python scripts/promote_to_general_manager.py <username or user_id>
```

The script will verify if the user is eligible for promotion and handle the role change.

## Important Notes

- General Managers can only manage users and properties that are assigned to them
- When converting from Manager to General Manager, all property assignments are preserved
- General Managers cannot create or edit Super Admin users
- General Managers cannot modify system-wide settings
- Only Super Admins can access the System Console which contains system settings, history, and communication settings

## Technical Details

The General Manager role is implemented as an extension of the Manager role with expanded permissions. The system validates all actions to ensure General Managers only have access to their assigned properties and the users linked to those properties.

The database schema remains the same, as it already supported the manager-property relationship through the `property_managers` table, which is also used for General Managers. 