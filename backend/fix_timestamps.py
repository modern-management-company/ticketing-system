#!/usr/bin/env python3
"""
Fix Timestamp Compatibility Issues Script

This script fixes common timestamp compatibility issues between SQLAlchemy models
and the database schema by directly modifying the database's timestamp columns
to be compatible with the expected type in the SQLAlchemy models.
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import subprocess

def backup_database():
    """Create a database backup before making changes"""
    print("Creating database backup...")
    # Run the backup function from setup_db
    from setup_db import backup_database
    backup_file = backup_database()
    if backup_file:
        print(f"Backup created: {backup_file}")
        return backup_file
    else:
        print("Failed to create backup.")
        return None

def fix_timestamp_compatibility():
    """Fix timestamp compatibility issues by modifying the database schema"""
    # Import needed modules
    from app import app, db
    from sqlalchemy import inspect, text
    
    # Define timestamp columns to fix - common DateTime columns in most models
    timestamp_columns = [
        # format: (table_name, column_name)
        ('users', 'created_at'),
        ('users', 'updated_at'),
        ('properties', 'created_at'),
        ('properties', 'updated_at'),
        ('tickets', 'created_at'),
        ('tickets', 'updated_at'),
        ('tickets', 'closed_at'),
        ('tasks', 'created_at'),
        ('tasks', 'updated_at'),
        ('tasks', 'due_date'),
        ('tasks', 'completed_at'),
        ('rooms', 'created_at'),
        ('rooms', 'updated_at'),
        ('rooms', 'last_cleaned'),
        ('property_managers', 'created_at'),
        ('property_managers', 'updated_at'),
        ('email_settings', 'created_at'),
        ('email_settings', 'updated_at'),
        ('sms_settings', 'created_at'),
        ('sms_settings', 'updated_at'),
    ]
    
    print("Analyzing timestamp columns...")
    
    # Fixes to apply
    fixes_to_apply = []
    
    # Check which columns exist and need fixing
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        for table_name, column_name in timestamp_columns:
            if table_name in tables:
                try:
                    columns = inspector.get_columns(table_name)
                    column_exists = any(col['name'] == column_name for col in columns)
                    
                    if column_exists:
                        # Get column info
                        column_info = next(col for col in columns if col['name'] == column_name)
                        column_type = str(column_info['type']).lower()
                        
                        # Check if type needs fixing (we want timestamp without time zone)
                        if 'timestamp' in column_type and 'without time zone' not in column_type:
                            fixes_to_apply.append((table_name, column_name, column_type))
                except Exception as e:
                    print(f"Error inspecting {table_name}.{column_name}: {str(e)}")
    
    if not fixes_to_apply:
        print("No timestamp compatibility issues found.")
        return True
    
    print(f"Found {len(fixes_to_apply)} timestamp columns to fix:")
    for table, column, current_type in fixes_to_apply:
        print(f"  • {table}.{column} (current: {current_type})")
    
    # Ask for confirmation
    response = input("Do you want to fix these timestamp compatibility issues? (yes/no): ")
    if response.lower() not in ('yes', 'y'):
        print("Operation cancelled.")
        return False
    
    # Create a backup before making changes
    backup_file = backup_database()
    if not backup_file:
        print("Failed to create backup. Aborting for safety.")
        return False
    
    # Apply fixes
    print("\nApplying fixes...")
    try:
        with app.app_context():
            for table, column, current_type in fixes_to_apply:
                print(f"Fixing {table}.{column}...")
                # Execute ALTER TABLE command
                alter_stmt = text(f"""
                    ALTER TABLE {table} 
                    ALTER COLUMN {column} TYPE TIMESTAMP WITHOUT TIME ZONE
                """)
                db.engine.execute(alter_stmt)
        
        print("\n✓ Timestamp compatibility issues fixed successfully!")
        return True
    except Exception as e:
        print(f"Error fixing timestamp compatibility: {str(e)}")
        print(f"You can restore from backup: {backup_file}")
        return False

def check_timestamp_compatibility():
    """Check if there are timestamp compatibility issues without fixing them"""
    # Import needed modules
    from app import app, db
    from sqlalchemy import inspect, text
    
    # Define timestamp columns to check - common DateTime columns in most models
    timestamp_columns = [
        # format: (table_name, column_name)
        ('users', 'created_at'),
        ('users', 'updated_at'),
        ('properties', 'created_at'),
        ('properties', 'updated_at'),
        ('tickets', 'created_at'),
        ('tickets', 'updated_at'),
        ('tickets', 'closed_at'),
        ('tasks', 'created_at'),
        ('tasks', 'updated_at'),
        ('tasks', 'due_date'),
        ('tasks', 'completed_at'),
        ('rooms', 'created_at'),
        ('rooms', 'updated_at'),
        ('rooms', 'last_cleaned'),
        ('property_managers', 'created_at'),
        ('property_managers', 'updated_at'),
        ('email_settings', 'created_at'),
        ('email_settings', 'updated_at'),
        ('sms_settings', 'created_at'),
        ('sms_settings', 'updated_at'),
    ]
    
    print("Analyzing timestamp columns...")
    
    # Issues found
    issues_found = []
    
    # Check which columns exist and need fixing
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        for table_name, column_name in timestamp_columns:
            if table_name in tables:
                try:
                    columns = inspector.get_columns(table_name)
                    column_exists = any(col['name'] == column_name for col in columns)
                    
                    if column_exists:
                        # Get column info
                        column_info = next(col for col in columns if col['name'] == column_name)
                        column_type = str(column_info['type']).lower()
                        
                        # Check if type has compatibility issues
                        if 'timestamp' in column_type and 'without time zone' not in column_type:
                            issues_found.append((table_name, column_name, column_type))
                except Exception as e:
                    print(f"Error inspecting {table_name}.{column_name}: {str(e)}")
    
    if not issues_found:
        print("✓ No timestamp compatibility issues found.")
        return True
    
    print(f"\n⚠️ Found {len(issues_found)} timestamp compatibility issues:")
    for table, column, current_type in issues_found:
        print(f"  • {table}.{column} (current: {current_type}, expected: timestamp without time zone)")
    
    print("\nRun this script with --fix to fix these issues.")
    return False

def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == '--fix':
        return 0 if fix_timestamp_compatibility() else 1
    else:
        # Just check by default
        result = check_timestamp_compatibility()
        print("\nUsage:")
        print("  python fix_timestamps.py       - Check for timestamp compatibility issues")
        print("  python fix_timestamps.py --fix - Fix timestamp compatibility issues")
        return 0 if result else 1

if __name__ == "__main__":
    print("🔧 Timestamp Compatibility Fix Tool 🔧")
    sys.exit(main()) 