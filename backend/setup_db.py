from app import app, db
from app.models import User, Property, Ticket, Task, TaskAssignment, Room, PropertyManager, EmailSettings, SMSSettings, ServiceRequest, UserProperty
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from sqlalchemy import text, inspect, MetaData
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.sql.sqltypes import String, Integer, Boolean, DateTime, JSON, Text, Float
import random
import os
import subprocess
from flask_migrate import upgrade, migrate, init, revision, current
from alembic.util.exc import CommandError
import sys
from pathlib import Path
import shutil
import re

def check_migrations_folder():
    """Check if migrations folder exists and initialize if it doesn't"""
    migrations_folder = Path("migrations")
    if not migrations_folder.exists():
        print("Initializing migrations folder...")
        try:
            with app.app_context():
                init()
            print("Migrations folder initialized successfully.")
            # Fix the env.py file to ensure it's configured correctly
            fix_migrations_env()
            return True
        except Exception as e:
            print(f"Error initializing migrations folder: {e}")
            return False
    else:
        # Check if the env.py file is valid
        return fix_migrations_env()

def get_model_tables():
    """Get all model tables defined in the application"""
    models = [
        User, Property, Ticket, Task, TaskAssignment, Room, 
        PropertyManager, EmailSettings, SMSSettings, ServiceRequest,
        UserProperty
    ]
    
    # Create a dictionary of table names to table objects
    tables = {}
    for model in models:
        if hasattr(model, '__tablename__'):
            tables[model.__tablename__] = model.__table__
    
    return tables

def map_sqlalchemy_to_db_type(column_type, dialect):
    """Map SQLAlchemy type to database type for comparison"""
    type_str = str(column_type)
    
    # Define type compatibility mappings
    type_mappings = {
        # Timestamp compatibility
        'TIMESTAMP': ['timestamp', 'timestamp without time zone', 'timestamp with time zone'],
        'DATETIME': ['timestamp', 'timestamp without time zone', 'timestamp with time zone'],
        'DateTime': ['timestamp', 'timestamp without time zone', 'timestamp with time zone'],
        'timestamp': ['timestamp', 'timestamp without time zone', 'timestamp with time zone'],
        'timestamp without time zone': ['timestamp', 'timestamp without time zone'],
        'timestamp with time zone': ['timestamp with time zone', 'timestamp'],
        
        # String compatibility
        'VARCHAR': ['character varying', 'varchar'],
        'TEXT': ['text'],
        
        # Numeric compatibility
        'INTEGER': ['integer', 'int', 'int4'],
        'BIGINT': ['bigint', 'int8'],
        'SMALLINT': ['smallint', 'int2'],
        'BOOLEAN': ['boolean', 'bool'],
        'FLOAT': ['double precision', 'float8', 'real', 'float4'],
        
        # JSON compatibility
        'JSON': ['json', 'jsonb'],
    }
    
    # Clean up the type string
    clean_type = type_str.replace('()', '').upper()
    
    # Extract length if present (e.g., VARCHAR(255))
    length = None
    if '(' in type_str and ')' in type_str:
        length_part = type_str[type_str.find('(')+1:type_str.find(')')]
        if length_part.isdigit():
            length = int(length_part)
            clean_type = clean_type.split('(')[0]
    
    # Return the compatible types
    for key, values in type_mappings.items():
        if clean_type == key.upper():
            return values
    
    # Default: return the original type string
    return [type_str.lower()]

def detect_model_changes():
    """Detect changes between SQLAlchemy models and database schema"""
    from app import app, db
    from sqlalchemy import inspect, text
    
    print("Analyzing database schema and models...")
    
    # Get database metadata
    with app.app_context():
        inspector = inspect(db.engine)
        dialect = db.engine.dialect.name
        existing_tables = inspector.get_table_names()
        model_tables = get_model_tables()  # This should now return {tablename: table_obj}
        
        changes_detected = False
        warnings_count = 0
        
        # Check for new tables (in models but not in db)
        new_tables = set(model_tables.keys()) - set(existing_tables)
        if new_tables:
            changes_detected = True
            print("\n🆕 New tables detected (will be created):")
            for table in new_tables:
                print(f"  + {table}")
        
        # Check for removed tables (in db but not in models)
        removed_tables = set(existing_tables) - set(model_tables.keys())
        if removed_tables:
            changes_detected = True
            print("\n⚠️ Tables in database but not in models (not managed by SQLAlchemy):")
            for table in removed_tables:
                # Skip alembic_version table used by Flask-Migrate
                if table != 'alembic_version':
                    print(f"  - {table}")
        
        # For each model table, check column differences
        for table_name, table in model_tables.items():
            if table_name in existing_tables:
                # Get columns from the database
                db_columns = {col['name']: col for col in inspector.get_columns(table_name)}
                
                # Get columns from the model - table should now be a Table object with a columns attribute
                model_columns = {col.name: col for col in table.columns}
                
                # Check for new columns (in model but not in db)
                new_columns = set(model_columns.keys()) - set(db_columns.keys())
                if new_columns:
                    changes_detected = True
                    print(f"\n🆕 New columns detected in table {table_name}:")
                    for col_name in new_columns:
                        col = model_columns[col_name]
                        print(f"  + {col_name} ({col.type})")
                
                # Check for removed columns (in db but not in model)
                removed_columns = set(db_columns.keys()) - set(model_columns.keys())
                if removed_columns:
                    changes_detected = True
                    print(f"\n⚠️ Columns in database but removed from model {table_name}:")
                    print(f"  ⚠️ WARNING: These columns will be dropped, which may cause DATA LOSS!")
                    for col_name in removed_columns:
                        col = db_columns[col_name]
                        print(f"  - {col_name} ({col['type']})")
                
                # Check for type changes in existing columns
                common_columns = set(model_columns.keys()) & set(db_columns.keys())
                for col_name in common_columns:
                    model_col = model_columns[col_name]
                    db_col = db_columns[col_name]
                    
                    # Get compatible types for comparison
                    model_type_str = str(model_col.type)
                    db_type_str = str(db_col['type'])
                    
                    # Get compatible types
                    model_compatible_types = map_sqlalchemy_to_db_type(model_col.type, dialect)
                    
                    # Check if the DB type is compatible with any of the model compatible types
                    db_type_lower = db_type_str.lower()
                    if not any(compatible_type in db_type_lower for compatible_type in model_compatible_types):
                        changes_detected = True
                        warnings_count += 1
                        print(f"Column type changed in {table_name}.{col_name}: DB={db_type_str}, Model={model_type_str}")
                        
                        # Check for potentially dangerous type conversions
                        dangerous_conversions = [
                            ('varchar', 'text', False),  # varchar to text is safe
                            ('text', 'varchar', True),   # text to varchar might truncate
                            ('integer', 'bigint', False), # integer to bigint is safe
                            ('bigint', 'integer', True),  # bigint to integer might overflow
                            ('timestamp', 'date', True),  # timestamp to date loses time
                            ('date', 'timestamp', False), # date to timestamp is safe
                        ]
                        
                        for src, dst, is_dangerous in dangerous_conversions:
                            if src in db_type_lower and dst in model_type_str.lower() and is_dangerous:
                                print(f"⚠️ WARNING: Changing column type for {table_name}.{col_name} may cause data loss!")
                
                # Check for NOT NULL constraint changes
                for col_name in common_columns:
                    model_col = model_columns[col_name]
                    db_col = db_columns[col_name]
                    
                    if model_col.nullable != db_col['nullable']:
                        changes_detected = True
                        warnings_count += 1
                        
                        if model_col.nullable and not db_col['nullable']:
                            print(f"Constraint relaxed in {table_name}.{col_name}: NOT NULL removed")
                        elif not model_col.nullable and db_col['nullable']:
                            print(f"⚠️ Constraint added to {table_name}.{col_name}: NOT NULL added")
                            print(f"⚠️ WARNING: Adding NOT NULL constraint to {table_name}.{col_name} may fail if nulls exist!")
        
        if warnings_count > 0:
            print(f"\n⚠️ {warnings_count} potential issues detected. Please review carefully before migration.")
            
        if not changes_detected:
            print("No model changes detected that require migration.")
        
        return changes_detected

def create_migration():
    """Create a new migration if there are model changes"""
    # First run our detailed detection
    changes_detected = detect_model_changes()
    if not changes_detected:
        return False
        
    # If changes detected, ask for confirmation
    print("\nChanges detected in the models. Creating migration...")
    print("IMPORTANT: This migration may include schema changes that could cause data loss.")
    print("Make sure you have a backup before applying this migration.\n")
    
    try:
        with app.app_context():
            # Create a new migration
            result = subprocess.run(
                ['flask', 'db', 'migrate', '-m', 'Auto-generated migration'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("Migration file created successfully.")
                
                # Path to the most recent migration
                migrations_path = Path("migrations/versions")
                migrations = sorted(migrations_path.glob("*.py"), key=os.path.getmtime, reverse=True)
                
                if migrations:
                    newest_migration = migrations[0]
                    print(f"Created migration file: {newest_migration}")
                    print("Please review this migration before applying it to ensure data integrity.")
                    
                return True
            else:
                print("Error creating migration:")
                print(result.stderr)
                return False
    except Exception as e:
        print(f"Error creating migration: {e}")
        return False

def validate_migration():
    """Validate the most recent migration to prevent data loss"""
    migrations_path = Path("migrations/versions")
    if not migrations_path.exists() or not migrations_path.is_dir():
        print("No migrations directory found.")
        return False
        
    # Get the most recent migration file
    migrations = sorted(migrations_path.glob("*.py"), key=os.path.getmtime, reverse=True)
    if not migrations:
        print("No migration files found.")
        return False
        
    # Read the newest migration file
    newest_migration = migrations[0]
    print(f"Validating migration: {newest_migration}")
    
    with open(newest_migration, 'r') as f:
        migration_code = f.read()
    
    # Check for potentially dangerous operations
    dangerous_ops = [
        ('drop_column', 'Drops columns which will cause data loss'),
        ('drop_table', 'Drops tables which will cause data loss'),
        ('drop_index', 'Drops indexes which might impact performance'),
        ('drop_constraint', 'Drops constraints which might impact data integrity'),
        # Type changes that might cause data loss
        ('alter_column.*TEXT', 'Changes TEXT column type which might cause data truncation'),
        ('alter_column.*VARCHAR', 'Changes VARCHAR column type which might cause data truncation'),
        ('alter_column.*NUMERIC', 'Changes NUMERIC column type which might cause data loss'),
        ('alter_column.*INTEGER', 'Changes INTEGER column type which might cause data loss'),
        ('alter_column.*create_not_null_constraint', 'Adds NOT NULL constraint which may fail if nulls exist'),
    ]
    
    # Safe timestamp conversions to ignore
    safe_timestamp_conversions = [
        ('timestamp', 'timestamp without time zone'),
        ('timestamp without time zone', 'timestamp'),
        ('timestamp with time zone', 'timestamp without time zone')
    ]
    
    # Check if the migration contains timestamp type changes (which are usually safe)
    timestamp_conversions = [
        ('timestamp', 'timestamp without time zone'),
        ('timestamp without time zone', 'timestamp')
    ]
    
    has_only_safe_timestamp_changes = False
    for source, target in timestamp_conversions:
        pattern = f"sa.{source}.*sa.{target}"
        if re.search(pattern, migration_code, re.IGNORECASE):
            has_only_safe_timestamp_changes = True
            print(f"Migration contains timestamp format changes from {source} to {target} (SAFE)")
    
    warnings = []
    for op, warning in dangerous_ops:
        if re.search(op, migration_code, re.IGNORECASE):
            # If it's just a safe timestamp conversion, don't flag it
            skip = False
            if 'alter_column' in op:
                for source, target in safe_timestamp_conversions:
                    pattern = f"alter_column.*{source}.*{target}"
                    if re.search(pattern, migration_code, re.IGNORECASE):
                        skip = True
                        break
            
            if not skip:
                warnings.append(f"WARNING: Migration contains '{op}' operation. {warning}.")
    
    if warnings and not has_only_safe_timestamp_changes:
        print("\nPotentially dangerous operations detected in migration:")
        for warning in warnings:
            print(f"- {warning}")
        print("\nPlease review the migration carefully before applying it.")
        
        # Ask for confirmation
        response = input("Do you want to continue with the migration anyway? (yes/no): ")
        return response.lower() in ('yes', 'y')
    
    return True

def safe_upgrade():
    """Safely upgrade the database, with rollback on failure"""
    try:
        with app.app_context():
            # Validate the migration
            if not validate_migration():
                print("Migration validation failed or was cancelled.")
                return False
                
            # Get current revision before upgrade
            prev_revision = current()
            
            # Create a backup
            backup_file = backup_database()
            if not backup_file:
                print("Failed to create backup. Aborting upgrade for safety.")
                return False
                
            print(f"Database backed up to {backup_file}")
            print("Proceeding with database upgrade...")
            
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
            print("Please restore from backup manually.")
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
                EmailSettings.__tablename__: EmailSettings,
                SMSSettings.__tablename__: SMSSettings
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

def reset_migrations():
    """Reset the migrations environment if needed"""
    try:
        migrations_folder = Path("migrations")
        if migrations_folder.exists():
            print("Migrations folder exists. Do you want to reset it? This will delete all migration history.")
            response = input("Reset migrations folder? (yes/no): ")
            if response.lower() in ('yes', 'y'):
                shutil.rmtree(migrations_folder)
                print("Migrations folder deleted.")
                return check_migrations_folder()
            else:
                print("Migrations folder not reset.")
                return True
        else:
            return check_migrations_folder()
    except Exception as e:
        print(f"Error resetting migrations: {str(e)}")
        return False

def fix_migrations_env():
    """Fix the migrations environment file if it has syntax errors"""
    try:
        env_file = Path("migrations/env.py")
        if not env_file.exists():
            print("Migrations env.py file not found.")
            return False
            
        # Check if the file has syntax errors by trying to compile it
        try:
            with open(env_file, 'r') as f:
                content = f.read()
                compile(content, env_file, 'exec')
            print("Migrations env.py file looks valid.")
            return True
        except SyntaxError as e:
            print(f"Syntax error found in env.py: {e}")
            print("Attempting to fix the migrations environment...")
            
            # Create a corrected version of env.py
            with open(env_file, 'w') as f:
                f.write("""from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from flask import current_app

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
from app import app
from app.models import User, Property, Ticket, Task, TaskAssignment, Room, PropertyManager, EmailSettings, SMSSettings
target_metadata = app.extensions['sqlalchemy'].db.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    \"\"\"Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    \"\"\"
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    \"\"\"Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    \"\"\"
    # Set SQLAlchemy URL from Flask app configuration
    with app.app_context():
        config.set_main_option('sqlalchemy.url', app.config.get('SQLALCHEMY_DATABASE_URI'))
    
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,   # Enable type comparison for migrations
            compare_server_default=True  # Check for default value changes
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
""")
            print("Fixed migrations/env.py file.")
            return True
    except Exception as e:
        print(f"Error fixing migrations environment: {str(e)}")
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