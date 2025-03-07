#!/usr/bin/env python3
"""
Database Management Script for the Ticketing System

This script provides a command-line interface for managing the database,
including detection of model changes, migrations, backups, and restores.

Usage:
  python manage_db.py [command]

Commands:
  detect-changes   - Check if there are model changes compared to the database
  analyze-schema   - Analyze database schema vs models in detail
  backup           - Create a database backup
  migrate          - Create and apply a new migration
  create-migration - Create a migration without applying it
  apply-migration  - Apply pending migrations
  restore <file>   - Restore database from a backup file
  setup            - Setup/initialize the database
  list-backups     - List all available database backups
  validate         - Validate the most recent migration file
  reset-migrations - Reset the migrations environment
  fix-migrations   - Fix the migrations environment
  init-fresh       - Initialize a fresh migration environment (delete existing migrations)
  check-timestamps - Check for timestamp compatibility issues
  fix-timestamps   - Fix timestamp compatibility issues
"""

import sys
import os
import shutil
from pathlib import Path
from datetime import datetime
from setup_db import (
    check_migrations_folder, 
    detect_model_changes,
    create_migration, 
    safe_upgrade, 
    backup_database, 
    restore_database,
    setup_database,
    validate_migration,
    reset_migrations,
    fix_migrations_env
)

def print_usage():
    """Print usage instructions"""
    print(__doc__)

def analyze_schema():
    """Analyze database schema vs models in detail"""
    # Custom import here to allow for detailed analysis beyond just detecting changes
    from app import app, db
    from sqlalchemy import inspect, MetaData
    import json
    
    try:
        with app.app_context():
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            # Store schema info for output
            schema_info = {
                "tables": {}
            }
            
            # Iterate through all tables
            for table_name in tables:
                table_info = {
                    "columns": [],
                    "primary_keys": inspector.get_pk_constraint(table_name).get('constrained_columns', []),
                    "foreign_keys": [],
                    "indexes": inspector.get_indexes(table_name),
                }
                
                # Get column details
                for column in inspector.get_columns(table_name):
                    table_info["columns"].append({
                        "name": column['name'],
                        "type": str(column['type']),
                        "nullable": column['nullable'],
                        "default": str(column.get('default', 'None')),
                    })
                
                # Get foreign keys
                for fk in inspector.get_foreign_keys(table_name):
                    table_info["foreign_keys"].append({
                        "name": fk.get('name'),
                        "referred_table": fk['referred_table'],
                        "referred_columns": fk['referred_columns'],
                        "constrained_columns": fk['constrained_columns'],
                    })
                
                schema_info["tables"][table_name] = table_info
            
            # Print the schema info in a human-readable format
            print("\n===== DATABASE SCHEMA ANALYSIS =====\n")
            print(f"Found {len(tables)} tables in the database:\n")
            
            for table_name, info in schema_info["tables"].items():
                print(f"TABLE: {table_name}")
                print("  COLUMNS:")
                for col in info["columns"]:
                    pk_marker = "*" if col["name"] in info["primary_keys"] else " "
                    null_marker = "NULL" if col["nullable"] else "NOT NULL"
                    print(f"    {pk_marker} {col['name']} ({col['type']}) {null_marker} DEFAULT={col['default']}")
                
                if info["foreign_keys"]:
                    print("  FOREIGN KEYS:")
                    for fk in info["foreign_keys"]:
                        print(f"    {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
                
                if info["indexes"]:
                    print("  INDEXES:")
                    for idx in info["indexes"]:
                        unique = "UNIQUE " if idx["unique"] else ""
                        print(f"    {unique}INDEX {idx['name']} ON {idx['column_names']}")
                
                print("")
            
            return True
    except Exception as e:
        print(f"Error analyzing schema: {e}")
        return False

def list_backups():
    """List all available database backups"""
    backup_dir = Path("database_backups")
    if not backup_dir.exists() or not backup_dir.is_dir():
        print("No backup directory found.")
        return
        
    backups = sorted(list(backup_dir.glob("backup_*.sql")), key=os.path.getmtime, reverse=True)
    
    if not backups:
        print("No backups found.")
        return
        
    print(f"Found {len(backups)} backups:")
    for i, backup in enumerate(backups, 1):
        timestamp = datetime.fromtimestamp(os.path.getmtime(backup))
        size_mb = os.path.getsize(backup) / (1024 * 1024)
        print(f"{i}. {backup.name} - {timestamp.strftime('%Y-%m-%d %H:%M:%S')} ({size_mb:.2f} MB)")

def create_migration_only():
    """Create a migration without applying it"""
    if not check_migrations_folder():
        return False
    
    return create_migration()

def apply_migration_only():
    """Apply pending migrations"""
    if not check_migrations_folder():
        return False
    
    return safe_upgrade()

def init_fresh_migrations():
    """Initialize a fresh migrations system without user confirmation"""
    migrations_dir = Path("migrations")
    
    # Backup the migrations folder first
    if migrations_dir.exists():
        backup_dir = Path("migrations_backup_" + datetime.now().strftime("%Y%m%d_%H%M%S"))
        print(f"Backing up existing migrations to {backup_dir}")
        shutil.copytree(migrations_dir, backup_dir)
        
        # Remove existing migrations
        print("Removing existing migrations directory...")
        shutil.rmtree(migrations_dir)
    
    # Run flask db init
    print("Initializing fresh migrations environment...")
    from flask_migrate import init
    from app import app
    
    with app.app_context():
        try:
            init()
            print("Migrations initialized successfully.")
            
            # Run fix_migrations_env to ensure env.py is correct
            try:
                print("Running fix_migrations.py to ensure correct environment...")
                import subprocess
                result = subprocess.run(['python3', 'fix_migrations.py'], capture_output=True, text=True)
                if result.returncode == 0:
                    print("Migration environment fixed successfully.")
                else:
                    print(f"Warning: Could not run fix_migrations.py: {result.stderr}")
                    # Fall back to the old method
                    from setup_db import fix_migrations_env
                    fix_migrations_env()
            except Exception as e:
                print(f"Warning: Error running fix_migrations.py: {e}")
                # Fall back to the old method
                from setup_db import fix_migrations_env
                fix_migrations_env()
            
            return True
        except Exception as e:
            print(f"Error initializing migrations: {e}")
            return False

def check_timestamp_compatibility():
    """Check for timestamp compatibility issues"""
    try:
        from fix_timestamps import check_timestamp_compatibility
        return check_timestamp_compatibility()
    except ImportError:
        print("Error: fix_timestamps.py module not found.")
        return False

def fix_timestamp_compatibility():
    """Fix timestamp compatibility issues"""
    try:
        from fix_timestamps import fix_timestamp_compatibility
        return fix_timestamp_compatibility()
    except ImportError:
        print("Error: fix_timestamps.py module not found.")
        return False

def main():
    """Main function for the script"""
    if len(sys.argv) < 2:
        print_usage()
        return 1
        
    command = sys.argv[1]
    
    if command == "detect-changes":
        # Check migrations folder and detect changes
        if not check_migrations_folder():
            return 1
            
        if detect_model_changes():
            print("Model changes detected. Consider running migration.")
            return 0
        else:
            print("No model changes detected.")
            return 1
    
    elif command == "analyze-schema":
        # Analyze database schema vs models in detail
        return 0 if analyze_schema() else 1
            
    elif command == "backup":
        # Create a database backup
        backup_file = backup_database()
        if backup_file:
            print(f"Backup created: {backup_file}")
            return 0
        else:
            print("Backup failed.")
            return 1
    
    elif command == "create-migration":
        # Create a migration without applying it
        if create_migration_only():
            print("Migration created. You can apply it with 'python manage_db.py apply-migration'.")
            return 0
        else:
            print("Failed to create migration.")
            return 1
    
    elif command == "apply-migration":
        # Apply pending migrations
        if apply_migration_only():
            print("Migration(s) applied successfully.")
            return 0
        else:
            print("Failed to apply migration(s).")
            return 1
            
    elif command == "migrate":
        # Create and apply a migration
        if not check_migrations_folder():
            return 1
            
        if create_migration():
            print("Migration created. Applying...")
            if safe_upgrade():
                print("Migration applied successfully.")
                return 0
            else:
                print("Failed to apply migration.")
                return 1
        else:
            print("No migration created.")
            return 1
    
    elif command == "validate":
        # Validate the most recent migration
        if validate_migration():
            print("Migration validation passed.")
            return 0
        else:
            print("Migration validation failed or was cancelled.")
            return 1
            
    elif command == "restore":
        # Restore from a backup file
        if len(sys.argv) < 3:
            print("Missing backup file argument.")
            print("Usage: python manage_db.py restore <backup_file>")
            return 1
            
        backup_file = sys.argv[2]
        if restore_database(backup_file):
            print(f"Database restored from {backup_file}")
            return 0
        else:
            print(f"Failed to restore from {backup_file}")
            return 1
            
    elif command == "setup":
        # Setup/initialize the database
        if setup_database():
            print("Database setup completed successfully.")
            return 0
        else:
            print("Database setup failed.")
            return 1
            
    elif command == "list-backups":
        # List all available backups
        list_backups()
        return 0
            
    elif command == "reset-migrations":
        # Reset the migrations environment
        if reset_migrations():
            print("Migrations environment reset successfully.")
            return 0
        else:
            print("Failed to reset migrations environment.")
            return 1
            
    elif command == "fix-migrations":
        # Fix the migrations environment
        if fix_migrations_env():
            print("Migrations environment fixed successfully.")
            return 0
        else:
            print("Failed to fix migrations environment.")
            return 1
            
    elif command == "init-fresh":
        # Initialize a fresh migrations system
        if init_fresh_migrations():
            print("Fresh migrations environment initialized successfully.")
            return 0
        else:
            print("Failed to initialize fresh migrations environment.")
            return 1
            
    elif command == "check-timestamps":
        # Check for timestamp compatibility issues
        return 0 if check_timestamp_compatibility() else 1
            
    elif command == "fix-timestamps":
        # Fix timestamp compatibility issues
        return 0 if fix_timestamp_compatibility() else 1
            
    else:
        print(f"Unknown command: {command}")
        print_usage()
        return 1

if __name__ == "__main__":
    sys.exit(main()) 