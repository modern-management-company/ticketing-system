from app import app, db
from app.models import User, Property, Ticket, Task, TaskAssignment, Room, PropertyManager, EmailSettings
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from sqlalchemy import text, inspect
import random
import os
import subprocess
from flask_migrate import upgrade, migrate, init, revision, current
from alembic.util.exc import CommandError
import sys
from pathlib import Path
import shutil

def check_migrations_folder():
    """Check if migrations folder exists and initialize if it doesn't"""
    migrations_folder = Path("migrations")
    if not migrations_folder.exists():
        print("Initializing migrations folder...")
        try:
            with app.app_context():
                init()
            print("Migrations folder initialized successfully.")
        except Exception as e:
            print(f"Error initializing migrations folder: {e}")
            return False
    return True

def create_migration():
    """Create a new migration if there are model changes"""
    try:
        with app.app_context():
            # Try to create a new migration
            result = subprocess.run(
                ['flask', 'db', 'migrate', '-m', 'Auto-generated migration'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("Migration created successfully.")
                print(result.stdout)
                return True
            else:
                print("No new changes detected or error creating migration.")
                print(result.stderr)
                return False
    except Exception as e:
        print(f"Error creating migration: {e}")
        return False

def safe_upgrade():
    """Safely upgrade the database, with rollback on failure"""
    try:
        with app.app_context():
            # Get current revision before upgrade
            prev_revision = current()
            
            # Attempt upgrade
            upgrade()
            print("Database upgraded successfully.")
            return True
    except Exception as e:
        print(f"Error during upgrade: {e}")
        try:
            # Attempt rollback to previous revision
            if prev_revision:
                print(f"Rolling back to previous revision: {prev_revision}")
                upgrade(revision=prev_revision)
                print("Rollback successful.")
        except Exception as rollback_error:
            print(f"Error during rollback: {rollback_error}")
        return False

def create_backup_directory():
    """Create backup directory if it doesn't exist"""
    backup_dir = Path("database_backups")
    if not backup_dir.exists():
        backup_dir.mkdir(parents=True)
    return backup_dir

def backup_database():
    """Create a backup of the current database state"""
    try:
        backup_dir = create_backup_directory()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"backup_{timestamp}.sql"
        
        # Get database URL from app config
        db_url = app.config['SQLALCHEMY_DATABASE_URI']
        
        # Parse database URL to get components
        # Expected format: postgresql://username:password@localhost:5432/dbname
        db_parts = db_url.replace('postgresql://', '').split('@')
        auth = db_parts[0].split(':')
        host_port_db = db_parts[1].split('/')
        host_port = host_port_db[0].split(':')
        
        username = auth[0]
        password = auth[1]
        host = host_port[0]
        port = host_port[1]
        dbname = host_port_db[1]
        
        # Set PGPASSWORD environment variable
        os.environ['PGPASSWORD'] = password
        
        # Create backup using pg_dump
        result = subprocess.run([
            'pg_dump',
            '-h', host,
            '-p', port,
            '-U', username,
            '-F', 'p',  # plain text format
            '-f', str(backup_file),
            dbname
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"Database backup created successfully at {backup_file}")
            return str(backup_file)
        else:
            print(f"Error creating backup: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"Error during backup: {e}")
        return None
    finally:
        # Clear PGPASSWORD environment variable
        if 'PGPASSWORD' in os.environ:
            del os.environ['PGPASSWORD']

def restore_database(backup_file):
    """Restore database from a backup file"""
    try:
        if not os.path.exists(backup_file):
            print(f"Backup file not found: {backup_file}")
            return False
            
        # Get database URL from app config
        db_url = app.config['SQLALCHEMY_DATABASE_URI']
        
        # Parse database URL to get components
        db_parts = db_url.replace('postgresql://', '').split('@')
        auth = db_parts[0].split(':')
        host_port_db = db_parts[1].split('/')
        host_port = host_port_db[0].split(':')
        
        username = auth[0]
        password = auth[1]
        host = host_port[0]
        port = host_port[1]
        dbname = host_port_db[1]
        
        # Set PGPASSWORD environment variable
        os.environ['PGPASSWORD'] = password
        
        # Drop all connections to the database
        with app.app_context():
            db.session.execute(text(
                f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{dbname}' AND pid <> pg_backend_pid()"
            ))
            db.session.commit()
        
        # Restore database using psql
        result = subprocess.run([
            'psql',
            '-h', host,
            '-p', port,
            '-U', username,
            '-d', dbname,
            '-f', backup_file
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"Database restored successfully from {backup_file}")
            return True
        else:
            print(f"Error restoring database: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"Error during restore: {e}")
        return False
    finally:
        # Clear PGPASSWORD environment variable
        if 'PGPASSWORD' in os.environ:
            del os.environ['PGPASSWORD']

def initialize_data():
    """Initialize database with default admin user"""
    try:
        with app.app_context():
            # Create admin user if none exists
            if User.query.count() == 0:
                # Create Super Admin
                admin = User(
                    username='admin',
                    email='admin@modernhotels.management',
                    password='admin123',
                    role='super_admin',
                    group='Executive',
                    phone='6144076457'
                )
                
                db.session.add(admin)
                db.session.commit()
                print("Admin user initialized.")

    except Exception as e:
        print(f"Error during data initialization: {e}")
        db.session.rollback()
        raise

def setup_database():
    """Main function to set up or update the database"""
    print("Starting database setup process...")
    
    try:
        with app.app_context():
            # Initialize database
            db.create_all()
            
            # Get all table names from the models
            model_tables = {
                User.__tablename__: User,
                Property.__tablename__: Property,
                Ticket.__tablename__: Ticket,
                Task.__tablename__: Task,
                TaskAssignment.__tablename__: TaskAssignment,
                Room.__tablename__: Room,
                PropertyManager.__tablename__: PropertyManager,
                EmailSettings.__tablename__: EmailSettings
            }
            
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            # Create missing tables
            for table_name, model in model_tables.items():
                if table_name not in existing_tables:
                    print(f"Creating table: {table_name}")
                    model.__table__.create(db.engine)
                else:
                    # Check for missing columns
                    existing_columns = {col['name'] for col in inspector.get_columns(table_name)}
                    model_columns = {col.name for col in model.__table__.columns}
                    missing_columns = model_columns - existing_columns
                    
                    if missing_columns:
                        print(f"Adding missing columns for {table_name}: {missing_columns}")
                        for col_name in missing_columns:
                            column = next(col for col in model.__table__.columns if col.name == col_name)
                            col_type = column.type.compile(db.engine.dialect)
                            nullable = "NULL" if column.nullable else "NOT NULL"
                            default = f"DEFAULT {column.default.arg}" if column.default is not None else ""
                            
                            # Handle reserved keywords by quoting them
                            quoted_col_name = f'"{col_name}"' if col_name.lower() in ['group', 'user', 'order', 'table'] else col_name
                            
                            db.session.execute(text(f"""
                                ALTER TABLE {table_name}
                                ADD COLUMN {quoted_col_name} {col_type} {nullable} {default}
                            """))
            
            db.session.commit()
            
            # Initialize admin user if needed
            if User.query.count() == 0:
                print("Initializing admin user...")
                initialize_data()
            else:
                print("Database already contains users. Skipping initialization.")
                
            print("Database setup completed successfully!")
            return True
            
    except Exception as e:
        print(f"Unexpected error during database setup: {e}")
        return False

if __name__ == '__main__':
    try:
        if setup_database():
            print("Database setup completed successfully!")
        else:
            print("Database setup failed!")
            sys.exit(1)
    except Exception as e:
        print(f"Unexpected error during database setup: {e}")
        sys.exit(1) 