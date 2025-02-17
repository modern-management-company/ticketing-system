from app import app, db
from app.models import User, Property, Ticket, Task, TaskAssignment, Room
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
        db.session.execute(text('DROP TABLE IF EXISTS property_themes CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS system_settings CASCADE'))
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
                'name': 'Wingate by Wyndham',
                'address': '701 Pike St, Marietta, OH 45750',
                'type': 'Hotel',
                'status': 'inactive'
            },
            {
                'name': 'Ramada by Wyndham',
                'address': '4801 W Broad St, Columbus, OH 43228',
                'type': 'Hotel',
                'status': 'inactive'
            },
            {
                'name': 'Fairfield Inn & Suites Avon',
                'address': '39050 Colorado Ave, Avon, OH 44011',
                'type': 'Hotel',
                'status': 'inactive'
            },
            {
                'name': 'Courtyard Akron Fairlawn',
                'address': '100 Springside Dr, Fairlawn, OH 44333',
                'type': 'Hotel',
                'status': 'inactive'
            },
            {
                'name': 'Fairfield Inn & Suites Canton',
                'address': '5285 Broadmoor Circle NW, Canton, OH 44709',
                'type': 'Hotel',
                'status': 'inactive'
            },
            {
                'name': 'Residence Inn Canton',
                'address': '5280 Broadmoor Circle NW, Canton, OH 44709',
                'type': 'Hotel',
                'status': 'active'
            },
            {
                'name': 'Hampton Inn Mansfield',
                'address': '1051 N Lexington Springmill Rd, Mansfield, OH 44906',
                'type': 'Hotel',
                'status': 'inactive'
            },
            {
                'name': 'Fairfield Inn & Suites Mansfield',
                'address': '1065 N Lexington Springmill Rd, Mansfield, OH 44906',
                'type': 'Hotel',
                'status': 'inactive'
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
        # Create Super Admin - Aditya
        aditya = User(
            username='aditya',
            email='adityadixit@live.com',
            password='aditya123',
            role='super_admin'
        )
        
        # Create Manager - Adixit
        adixit = User(
            username='adixit',
            email='adixit@nyu.edu',
            password='adixit123',
            role='manager'
        )
        
        # Create Regular User - Adidix
        adidix = User(
            username='adidix',
            email='aditya@adityadixit.com',
            password='adidix123',
            role='user'
        )
        
        db.session.add_all([aditya, adixit, adidix])
        db.session.commit()
        
        # Create manager users (one for each property)
        managers = [adixit]  # Start with adixit as the first manager
        
        # Create regular users (2 users per property)
        users = []
        user_credentials = [
            ('FIC_U1', 'FIC_U2', 'Fairfield Inn & Suites Canton'),
            ('RIC_U1', 'RIC_U2', 'Residence Inn Canton')
        ]
        
        for user1, user2, _ in user_credentials:
            users.extend([
                User(username=user1, email=f"{user1.lower()}@example.net", password=f"{user1.lower()}123", role='user'),
                User(username=user2, email=f"{user2.lower()}@example.net", password=f"{user2.lower()}123", role='user')
            ])

        all_users = [aditya] + managers + users
        db.session.add_all(all_users)
        db.session.commit()

        # Get only active properties
        active_properties = [p for p in properties if p.status == 'active']

        # Create Rooms for each property
        room_types = ['Single', 'Double', 'Suite', 'Conference', 'Other'];
        room_statuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning'];        floors = [1, 2, 3, 4]
        floors = [1, 2, 3, 4]

        rooms = []
        for prop in active_properties:  # Only create rooms for active properties
            # Create 15-20 rooms for each property
            num_rooms = random.randint(15, 20)
            for i in range(num_rooms):
                room = Room(
                    name=f'Room {(i+1):03d}',
                    property_id=prop.property_id,
                    type=random.choice(room_types),
                    floor=random.choice(floors),
                    status=random.choice(room_statuses),
                    capacity=random.randint(2, 6),
                    amenities=['Wi-Fi', 'TV', 'Mini Bar', 'Coffee Maker'],
                    description=f'Comfortable room with modern amenities',
                    last_cleaned=datetime.utcnow() - timedelta(days=random.randint(0, 7))
                )
                rooms.append(room)
        
        db.session.add_all(rooms)
        db.session.commit()

        # Update property assignments
        # First, clear any existing assignments
        for user in users + managers:
            user.assigned_properties = []
        
        # Assign all active properties to adixit (manager)
        adixit.assigned_properties = active_properties
        for prop in active_properties:
            prop.manager_id = adixit.user_id
        
        # Assign all active properties to adidix (regular user)
        adidix.assigned_properties = active_properties
        
        # Assign properties to other users (one property each)
        for i, prop in enumerate(active_properties):
            # Get the two users for this property
            user1 = users[i * 2]
            user2 = users[i * 2 + 1]
            
            # Assign their main property
            user1.assigned_properties.append(prop)
            user2.assigned_properties.append(prop)
            
            # Assign the other Canton property as well
            other_prop = active_properties[1 if i == 0 else 0]
            user1.assigned_properties.append(other_prop)
            user2.assigned_properties.append(other_prop)
        
        db.session.commit()

        # Create Tickets
        ticket_titles = [
            'AC not working', 'Water leak in bathroom', 'Broken furniture',
            'TV malfunction', 'Noise complaint', 'Plumbing issue',
            'Heating system problem', 'Electrical outlet not working',
            'Window won\'t close', 'Door lock malfunction'
        ]
        
        ticket_descriptions = [
            'Unit is not cooling properly and making strange noises',
            'Water leaking from ceiling in bathroom',
            'Chair leg is broken and needs immediate repair',
            'Television not turning on or showing static',
            'Loud noises coming from adjacent room',
            'Toilet is not flushing properly',
            'Room temperature control not responding',
            'Electrical outlet sparking when used',
            'Window stuck open and won\'t close properly',
            'Key card reader not functioning correctly'
        ]

        priorities = ['Low', 'Medium', 'High', 'Critical']
        categories = ['Maintenance', 'Housekeeping', 'Security', 'IT', 'General']
        
        tickets = []
        for prop in active_properties:  # Only create tickets for active properties
            # Create 3-5 tickets for each property
            num_tickets = random.randint(3, 5)
            for _ in range(num_tickets):
                title_index = random.randint(0, len(ticket_titles)-1)
                ticket = Ticket(
                    title=ticket_titles[title_index],
                    description=ticket_descriptions[title_index],
                    status=random.choice(['open', 'in progress', 'completed']),
                    priority=random.choice(priorities),
                    category=random.choice(categories),
                    property_id=prop.property_id,
                    user_id=random.choice(users).user_id,
                    room_id=random.choice([r.room_id for r in rooms if r.property_id == prop.property_id])
                )
                tickets.append(ticket)
        
        db.session.add_all(tickets)
        db.session.commit()

        # Create Tasks
        task_titles = [
            'Inspect and repair AC', 'Fix water leak', 'Replace broken furniture',
            'Repair TV system', 'Investigate noise complaint', 'Resolve plumbing issue',
            'Service heating system', 'Replace electrical outlet', 'Repair window',
            'Fix door lock mechanism'
        ]
        
        task_descriptions = [
            'Complete inspection and repair of AC unit',
            'Locate and repair source of water leak',
            'Replace or repair damaged furniture',
            'Diagnose and fix television system issues',
            'Investigate and address noise complaints',
            'Clear blockage and repair plumbing',
            'Perform maintenance on heating system',
            'Replace faulty electrical outlet',
            'Repair window closing mechanism',
            'Replace or repair door lock system'
        ]

        tasks = []
        for prop in active_properties:  # Only create tasks for active properties
            # Create 3-5 tasks for each property
            num_tasks = random.randint(3, 5)
            for _ in range(num_tasks):
                title_index = random.randint(0, len(task_titles)-1)
                task = Task(
                    title=task_titles[title_index],
                    description=task_descriptions[title_index],
                    status=random.choice(['pending', 'in progress', 'completed']),
                    priority=random.choice(priorities),
                    property_id=prop.property_id,
                    assigned_to_id=random.choice(users).user_id,
                    due_date=datetime.utcnow() + timedelta(days=random.randint(1, 14))
                )
                tasks.append(task)
        
        db.session.add_all(tasks)
        db.session.commit()

        print("Database initialized with test data!")

if __name__ == '__main__':
    setup_database() 