from app import app, db
from app.models import User, Property, Ticket, Task, TaskAssignment, Room, PropertyManager, EmailSettings
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from sqlalchemy import text
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

def setup_database():
    """Main function to set up or update the database"""
    print("Starting database setup process...")
    
    # Create backup before making any changes
    print("Creating database backup...")
    backup_file = backup_database()
    if not backup_file:
        print("Failed to create database backup. Proceeding with caution...")
    
    # Check and initialize migrations folder if needed
    if not check_migrations_folder():
        print("Failed to initialize migrations. Exiting.")
        return False

    # Create new migration if there are model changes
    if create_migration():
        print("Attempting to apply new migration...")
        if not safe_upgrade():
            print("Failed to apply migration. Attempting to restore from backup...")
            if backup_file and restore_database(backup_file):
                print("Database restored successfully from backup.")
            else:
                print("Failed to restore database from backup.")
            return False

    with app.app_context():
        # Check if we need to initialize data
        if User.query.count() == 0:
            print("No users found. Initializing database with default data...")
            try:
                initialize_data()
            except Exception as e:
                print(f"Error during data initialization: {e}")
                if backup_file and restore_database(backup_file):
                    print("Database restored successfully from backup.")
                else:
                    print("Failed to restore database from backup.")
                return False
        else:
            print("Database already contains data. Skipping initialization.")
    
    print("Database setup completed successfully!")
    
    # Clean up old backups (keep last 5)
    try:
        backup_dir = Path("database_backups")
        if backup_dir.exists():
            backups = sorted(backup_dir.glob("backup_*.sql"))
            if len(backups) > 5:
                for old_backup in backups[:-5]:
                    old_backup.unlink()
                print(f"Cleaned up {len(backups) - 5} old backup(s)")
    except Exception as e:
        print(f"Warning: Failed to clean up old backups: {e}")
    
    return True

def initialize_data():
    """Initialize database with default data"""
    try:
        with app.app_context():
            # Initialize email settings if not exists
            if EmailSettings.query.count() == 0:
                email_settings = EmailSettings(
                    smtp_server='smtp.gmail.com',
                    smtp_port=587,
                    smtp_username='modernmanagementhotels@gmail.com',
                    smtp_password=os.getenv('EMAIL_PASSWORD', ''),
                    sender_email='modernmanagementhotels@gmail.com',
                    enable_email_notifications=True
                )
                db.session.add(email_settings)
                db.session.commit()
                print("Email settings initialized.")

            # Create Properties if none exist
            if Property.query.count() == 0:
                hotels = [
                    {
                        'name': 'Residence Inn Canton',
                        'address': '5280 Broadmoor Circle NW, Canton, OH 44709',
                        'type': 'Hotel',
                        'status': 'active'
                    }
                ]

                properties = []
                for hotel in hotels:
                    prop = Property(
                        name=hotel['name'],
                        address=hotel['address'],
                        type=hotel['type'],
                        status=hotel['status']
                    )
                    properties.append(prop)
                    db.session.add(prop)
                
                db.session.commit()

                # Create Users if none exist
                if User.query.count() == 0:
                    # Create Super Admin
                    admin = User(
                        username='admin',
                        email='admin@modernhotels.management',
                        password='admin@123',
                        role='super_admin',
                        group='Executive'
                    )
                    
                    # Create Basic User
                    basic_user = User(
                        username='user',
                        email='user@modernhotels.management',
                        password='basic@123',
                        role='user',
                        group='Front Desk'
                    )
                    
                    # Create Department Managers
                    manager_engineering = User(
                        username='manager.engineering',
                        email='manager.engineering@modernhotels.management',
                        password='engineering@123',
                        role='manager',
                        group='Engineering'
                    )
                    
                    manager_frontdesk = User(
                        username='manager.frontdesk',
                        email='manager.frontdesk@modernhotels.management',
                        password='frontdesk@123',
                        role='manager',
                        group='Front Desk'
                    )
                    
                    manager_housekeeping = User(
                        username='manager.housekeeping',
                        email='manager.housekeeping@modernhotels.management',
                        password='housekeeping@123',
                        role='manager',
                        group='Housekeeping'
                    )
                    
                    db.session.add_all([admin, basic_user, manager_engineering, manager_frontdesk, manager_housekeeping])
                    db.session.commit()

                    # Get active properties
                    active_properties = [p for p in properties if p.status == 'active']

                    # Create property manager assignments
                    for prop in active_properties:
                        # Assign managers based on their groups
                        for manager in [manager_engineering, manager_frontdesk, manager_housekeeping]:
                            prop_manager = PropertyManager(
                                property_id=prop.property_id,
                                user_id=manager.user_id
                            )
                            db.session.add(prop_manager)
                
                    db.session.commit()

                    # Assign all active properties to all users
                    all_users = [basic_user, manager_engineering, manager_frontdesk, manager_housekeeping]
                    for user in all_users:
                        user.assigned_properties = active_properties
        
                    db.session.commit()

                # Create rooms if none exist
                if Room.query.count() == 0:
                    # Define room types and statuses
                    room_types = {
                        'STDO': 'Studio',
                        'ONBR': 'One Bedroom',
                        'TOBR': 'Two Bedroom',
                        'PUBLIC': 'Public Area'
                    }

                    room_statuses = ['Available', 'Out of Order', 'Maintenance', 'Cleaning']

                    # Guest Rooms Data
                    guest_rooms_data = [
                        # First Floor
                        {'number': '100', 'type': 'STDO', 'floor': 1},
                        {'number': '101', 'type': 'STDO', 'floor': 1},
                        {'number': '102', 'type': 'ONBR', 'floor': 1, 'issues': ['odor', 'mold smell']},
                        {'number': '103', 'type': 'ONBR', 'floor': 1},
                        {'number': '104', 'type': 'TOBR', 'floor': 1},
                        {'number': '105', 'type': 'TOBR', 'floor': 1, 'issues': ['fireplace', 'door locks']},
                        {'number': '106', 'type': 'STDO', 'floor': 1},
                        {'number': '107', 'type': 'STDO', 'floor': 1},
                        {'number': '109', 'type': 'TOBR', 'floor': 1},
                        {'number': '111', 'type': 'TOBR', 'floor': 1},
                        {'number': '112', 'type': 'ONBR', 'floor': 1},
                        {'number': '113', 'type': 'ONBR', 'floor': 1},
                        {'number': '114', 'type': 'ONBR', 'floor': 1},
                        {'number': '115', 'type': 'ONBR', 'floor': 1},
                        {'number': '116', 'type': 'ONBR', 'floor': 1},
                        {'number': '117', 'type': 'ONBR', 'floor': 1},
                        {'number': '118', 'type': 'ONBR', 'floor': 1},
                        {'number': '119', 'type': 'ONBR', 'floor': 1},
                        {'number': '120', 'type': 'ONBR', 'floor': 1},
                        {'number': '121', 'type': 'ONBR', 'floor': 1, 'issues': ['dishwasher loose', 'drawer broken']},
                        {'number': '122', 'type': 'STDO', 'floor': 1, 'status': 'Out of Order', 'notes': 'USED FOR STORAGE: ETA 1/15/25'},
                        {'number': '123', 'type': 'STDO', 'floor': 1},
                        
                        # Second Floor
                        {'number': '200', 'type': 'STDO', 'floor': 2},
                        {'number': '201', 'type': 'STDO', 'floor': 2, 'issues': ['shower liner', 'floor strip']},
                        {'number': '202', 'type': 'ONBR', 'floor': 2},
                        {'number': '203', 'type': 'ONBR', 'floor': 2},
                        {'number': '204', 'type': 'TOBR', 'floor': 2},
                        {'number': '205', 'type': 'TOBR', 'floor': 2},
                        {'number': '206', 'type': 'STDO', 'floor': 2, 'issues': ['door locks']},
                        {'number': '207', 'type': 'STDO', 'floor': 2},
                        {'number': '209', 'type': 'TOBR', 'floor': 2},
                        {'number': '211', 'type': 'TOBR', 'floor': 2},
                        {'number': '212', 'type': 'ONBR', 'floor': 2},
                        {'number': '213', 'type': 'ONBR', 'floor': 2},
                        {'number': '214', 'type': 'ONBR', 'floor': 2},
                        {'number': '215', 'type': 'ONBR', 'floor': 2, 'issues': ['smoke alarm']},
                        {'number': '216', 'type': 'ONBR', 'floor': 2, 'issues': ['kitchen drawers', 'bathroom door']},
                        {'number': '217', 'type': 'ONBR', 'floor': 2, 'issues': ['door plate']},
                        {'number': '218', 'type': 'ONBR', 'floor': 2, 'issues': ['floor lamp', 'phones']},
                        {'number': '219', 'type': 'ONBR', 'floor': 2, 'issues': ['ceiling patch']},
                        {'number': '220', 'type': 'ONBR', 'floor': 2},
                        {'number': '221', 'type': 'ONBR', 'floor': 2, 'issues': ['hvac']},
                        {'number': '222', 'type': 'STDO', 'floor': 2},
                        {'number': '223', 'type': 'STDO', 'floor': 2},
                        
                        # Third Floor
                        {'number': '300', 'type': 'STDO', 'floor': 3},
                        {'number': '301', 'type': 'STDO', 'floor': 3},
                        {'number': '302', 'type': 'ONBR', 'floor': 3},
                        {'number': '303', 'type': 'ONBR', 'floor': 3},
                        {'number': '304', 'type': 'TOBR', 'floor': 3},
                        {'number': '305', 'type': 'TOBR', 'floor': 3},
                        {'number': '306', 'type': 'STDO', 'floor': 3},
                        {'number': '307', 'type': 'STDO', 'floor': 3},
                        {'number': '309', 'type': 'TOBR', 'floor': 3, 'issues': ['tv']},
                        {'number': '311', 'type': 'TOBR', 'floor': 3},
                        {'number': '312', 'type': 'ONBR', 'floor': 3, 'issues': ['hvac']},
                        {'number': '313', 'type': 'ONBR', 'floor': 3},
                        {'number': '314', 'type': 'ONBR', 'floor': 3},
                        {'number': '315', 'type': 'ONBR', 'floor': 3},
                        {'number': '316', 'type': 'ONBR', 'floor': 3},
                        {'number': '317', 'type': 'ONBR', 'floor': 3},
                        {'number': '318', 'type': 'ONBR', 'floor': 3, 'issues': ['window ac']},
                        {'number': '319', 'type': 'ONBR', 'floor': 3},
                        {'number': '320', 'type': 'ONBR', 'floor': 3},
                        {'number': '321', 'type': 'ONBR', 'floor': 3},
                        {'number': '322', 'type': 'STDO', 'floor': 3},
                        {'number': '323', 'type': 'STDO', 'floor': 3}
                    ]

                    # Public Areas Data
                    public_areas_data = [
                        {'name': 'Lobby Men\'s Room', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Lobby Women\'s Room', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Fitness Center', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Pool', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Pool Maintenance Room', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Breakfast Kitchen', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Breakfast Buffet', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Lobby Living Room', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Sales Office', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'GM Office', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Market Storage', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Breakroom', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Laundry room', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Boiler Room', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Business Center', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Dry Storage', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Cold Storage', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Elevator Room', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Elevator - Central', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Stairwell North', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Stairwell SW', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'First Floor 09 Storage', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Second Floor Housekeeping', 'type': 'PUBLIC', 'floor': 2},
                        {'name': 'Guest Laundry', 'type': 'PUBLIC', 'floor': 2},
                        {'name': 'HK Office', 'type': 'PUBLIC', 'floor': 2},
                        {'name': 'Second Floor Linen Closet', 'type': 'PUBLIC', 'floor': 2},
                        {'name': 'Second Floor 09 Storage', 'type': 'PUBLIC', 'floor': 2},
                        {'name': 'Maintenance Office', 'type': 'PUBLIC', 'floor': 2},
                        {'name': 'Third Floor Linen Closet', 'type': 'PUBLIC', 'floor': 3},
                        {'name': 'Third Floor 09 Storage', 'type': 'PUBLIC', 'floor': 3},
                        {'name': 'First Floor Hall', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Second Floor Hall', 'type': 'PUBLIC', 'floor': 2},
                        {'name': 'Third Floor Hall', 'type': 'PUBLIC', 'floor': 3},
                        {'name': 'Outdoor Patio', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Outdoor Walkways', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Parking Lot', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Lobby Ice Maker', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Market', 'type': 'PUBLIC', 'floor': 1},
                        {'name': 'Electrical Room', 'type': 'PUBLIC', 'floor': 1}
                    ]

                    # Create rooms
                    residence_inn = Property.query.filter_by(name='Residence Inn Canton').first()
                    if residence_inn:
                        rooms = []
                        room_map = {}  # Map to store room numbers to room objects
                        
                        # Create guest rooms
                        for room_data in guest_rooms_data:
                            room = Room(
                                name=f"Room {room_data['number']}",
                                property_id=residence_inn.property_id,
                                type=room_types[room_data['type']],
                                floor=room_data['floor'],
                                status=room_data.get('status', 'Available'),
                                description=room_data.get('notes', ''),
                                capacity=2 if room_data['type'] == 'STDO' else 4 if room_data['type'] == 'ONBR' else 6
                            )
                            rooms.append(room)
                            room_map[room_data['number']] = room
                            db.session.add(room)
                        
                        # Create public areas
                        for area_data in public_areas_data:
                            room = Room(
                                name=area_data['name'],
                                property_id=residence_inn.property_id,
                                type=room_types[area_data['type']],
                                floor=area_data['floor'],
                                status='Available',
                                capacity=0
                            )
                            rooms.append(room)
                            db.session.add(room)
                        
                        db.session.commit()

                        # Create tickets for rooms with issues
                        for room_data in guest_rooms_data:
                            if 'issues' in room_data:
                                room = room_map[room_data['number']]
                                for issue in room_data['issues']:
                                    # Determine category and subcategory based on issue
                                    category, subcategory = get_category_and_subcategory(issue)
                                    
                                    # Determine the appropriate manager based on category
                                    assigned_manager = None
                                    if category == 'Maintenance':
                                        assigned_manager = User.query.filter_by(username='manager.engineering').first()
                                    elif category == 'Housekeeping':
                                        assigned_manager = User.query.filter_by(username='manager.housekeeping').first()
                                    else:
                                        assigned_manager = User.query.filter_by(username='manager.frontdesk').first()

                                    if assigned_manager:
                                        ticket = Ticket(
                                            title=f"Room {room_data['number']} - {issue.title()}",
                                            description=f"Issue reported in Room {room_data['number']}: {issue}",
                                            status='open',
                                            priority='High' if room_data.get('status') == 'Out of Order' else 'Medium',
                                            category=category,
                                            subcategory=subcategory,
                                            property_id=residence_inn.property_id,
                                            user_id=assigned_manager.user_id,
                                            room_id=room.room_id
                                        )
                                        db.session.add(ticket)
                                        db.session.flush()  # Flush to get the ticket_id

                                        # Create a task for the ticket
                                        task = Task(
                                            title=f"Handle {category} Issue - {issue.title()}",
                                            description=f"Address {category} issue in Room {room_data['number']}: {issue}",
                                            status='pending',
                                            priority=ticket.priority,
                                            property_id=residence_inn.property_id,
                                            assigned_to_id=assigned_manager.user_id,
                                            due_date=datetime.utcnow() + timedelta(days=3)
                                        )
                                        db.session.add(task)
                                        db.session.flush()

                                        # Create task assignment linking task to ticket
                                        task_assignment = TaskAssignment(
                                            task_id=task.task_id,
                                            ticket_id=ticket.ticket_id,
                                            assigned_to_user_id=assigned_manager.user_id,
                                            status='Pending'
                                        )
                                        db.session.add(task_assignment)
                        
                        db.session.commit()
    except Exception as e:
        print(f"Error during data initialization: {e}")
        db.session.rollback()
        raise

def get_category_and_subcategory(issue):
    """Helper function to determine category and subcategory based on the issue"""
    maintenance_issues = {
        'hvac': ('Maintenance', 'HVAC'),
        'fireplace': ('Maintenance', 'Fireplace'),
        'door locks': ('Maintenance', 'Door Locks'),
        'door plate': ('Maintenance', 'Door Locks'),
        'tv': ('Maintenance', 'TV'),
        'dishwasher loose': ('Maintenance', 'Appliances'),
        'drawer broken': ('Maintenance', 'Furniture'),
        'floor lamp': ('Maintenance', 'Electrical'),
        'phones': ('Maintenance', 'Electrical'),
        'smoke alarm': ('Maintenance', 'Electrical'),
        'ceiling patch': ('Maintenance', 'General'),
        'window ac': ('Maintenance', 'HVAC'),
        'kitchen drawers': ('Maintenance', 'Furniture'),
        'bathroom door': ('Maintenance', 'Door Locks')
    }
    
    housekeeping_issues = {
        'mold smell': ('Housekeeping', 'Odor'),
        'odor': ('Housekeeping', 'Odor'),
        'shower liner': ('Housekeeping', 'Bathroom'),
        'floor strip': ('Housekeeping', 'Carpet/Flooring')
    }
    
    # Check if issue is in maintenance dictionary
    if issue.lower() in maintenance_issues:
        return maintenance_issues[issue.lower()]
    
    # Check if issue is in housekeeping dictionary
    if issue.lower() in housekeeping_issues:
        return housekeeping_issues[issue.lower()]
    
    # Default to maintenance general if not found
    return ('Maintenance', 'General')

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