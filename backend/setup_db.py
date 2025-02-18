from app import app, db
from app.models import User, Property, Ticket, Task, TaskAssignment, Room, PropertyManager
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from sqlalchemy import text
import random

def clear_database():
    with app.app_context():
        # Drop all tables with CASCADE to handle dependencies
        db.session.execute(text('DROP TABLE IF EXISTS activities CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS task_assignments CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS tasks CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS tickets CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS rooms CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS user_properties CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS property_managers CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS properties CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS users CASCADE'))
        db.session.commit()
        
        # Recreate all tables
        print("Creating fresh tables...")
        db.create_all()
        
        print("Database cleared and recreated successfully!")

def setup_database():
    # First clear everything
    clear_database()

    with app.app_context():
        # Create Properties
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

        # Create Users
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

        # Assign all active properties to basic user
        basic_user.assigned_properties = active_properties

        # Define room types and statuses
        room_types = {
            'STDO': 'Studio',
            'ONBR': 'One Bedroom',
            'TOBR': 'Two Bedroom',
            'PUBLIC': 'Public Area'
        }

        room_statuses = ['Available', 'Out of Order', 'Maintenance', 'Cleaning']

        # Define maintenance subcategories
        maintenance_subcategories = [
            'HVAC',
            'Fireplace',
            'Hot Water',
            'Door Locks',
            'TV',
            'Plumbing',
            'Electrical',
            'Appliances',
            'Furniture',
            'Windows',
            'General'
        ]

        # Define housekeeping subcategories
        housekeeping_subcategories = [
            'Deep Cleaning',
            'Linens',
            'Bathroom',
            'Kitchen',
            'Carpet/Flooring',
            'Odor',
            'Supplies',
            'General'
        ]

        # Create rooms for Residence Inn Canton
        residence_inn = active_properties[0]
        
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

        # Create all rooms
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
        
        # Commit rooms first to get room_ids
        db.session.commit()
        
        # Create tickets for rooms with issues
        for room_data in guest_rooms_data:
            if 'issues' in room_data:
                room = room_map[room_data['number']]
                for issue in room_data['issues']:
                    # Determine category and subcategory based on issue
                    category, subcategory = get_category_and_subcategory(issue)
                    
                    ticket = Ticket(
                        title=f"Room {room_data['number']} - {issue.title()}",
                        description=f"Issue reported in Room {room_data['number']}: {issue}",
                        status='open',
                        priority='High' if room_data.get('status') == 'Out of Order' else 'Medium',
                        category=category,
                        subcategory=subcategory,
                        property_id=residence_inn.property_id,
                        user_id=manager_engineering.user_id if category == 'Maintenance' else manager_housekeeping.user_id,
                        room_id=room.room_id
                    )
                    db.session.add(ticket)
        
        # Commit tickets
        db.session.commit()

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
        'window ac': ('Maintenance', 'HVAC')
    }
    
    housekeeping_issues = {
        'mold smell': ('Housekeeping', 'Odor'),
        'odor': ('Housekeeping', 'Odor'),
        'shower liner': ('Housekeeping', 'Bathroom'),
        'floor strip': ('Housekeeping', 'Carpet/Flooring'),
        'bathroom door': ('Housekeeping', 'General'),
        'kitchen drawers': ('Housekeeping', 'Kitchen')
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
    setup_database() 