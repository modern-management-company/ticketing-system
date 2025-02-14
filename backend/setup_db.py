from app import app, db
from app.models import User, Property, Ticket, Task, TaskAssignment, Room, PropertyTheme, SystemSettings
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
                'type': 'Hotel'
            },
            {
                'name': 'Ramada by Wyndham',
                'address': '4801 W Broad St, Columbus, OH 43228',
                'type': 'Hotel'
            },
            {
                'name': 'Fairfield Inn & Suites Avon',
                'address': '39050 Colorado Ave, Avon, OH 44011',
                'type': 'Hotel'
            },
            {
                'name': 'Courtyard Akron Fairlawn',
                'address': '100 Springside Dr, Fairlawn, OH 44333',
                'type': 'Hotel'
            },
            {
                'name': 'Fairfield Inn & Suites Canton',
                'address': '5285 Broadmoor Circle NW, Canton, OH 44709',
                'type': 'Hotel'
            },
            {
                'name': 'Residence Inn Canton',
                'address': '5280 Broadmoor Circle NW, Canton, OH 44709',
                'type': 'Hotel'
            },
            {
                'name': 'Hampton Inn Mansfield',
                'address': '1051 N Lexington Springmill Rd, Mansfield, OH 44906',
                'type': 'Hotel'
            },
            {
                'name': 'Fairfield Inn & Suites Mansfield',
                'address': '1065 N Lexington Springmill Rd, Mansfield, OH 44906',
                'type': 'Hotel'
            }
        ]

        properties = []
        for hotel in hotels:
            prop = Property(
                name=hotel['name'],
                address=hotel['address'],
                type=hotel['type']
            )
            properties.append(prop)
            db.session.add(prop)
        
        db.session.commit()

        # Create Users
        admin = User(username='admin', email="admin@example.net", password='admin123', role='super_admin')
        
        # Create manager users (one for each property)
        managers = []
        manager_credentials = [
            ('WBW_M', 'Wingate by Wyndham'),
            ('RBW_M', 'Ramada by Wyndham'),
            ('FIA_M', 'Fairfield Inn & Suites Avon'),
            ('CAF_M', 'Courtyard Akron Fairlawn'),
            ('FIC_M', 'Fairfield Inn & Suites Canton'),
            ('RIC_M', 'Residence Inn Canton'),
            ('HIM_M', 'Hampton Inn Mansfield'),
            ('FIM_M', 'Fairfield Inn & Suites Mansfield')
        ]
        
        for (username, hotel_name), prop in zip(manager_credentials, properties):
            manager = User(
                username=username,
                email=f"{username.lower()}@example.net",
                password=f"{username.lower()}123",
                role='manager'
            )
            managers.append(manager)
            prop.manager_id = manager.user_id
        
        # Create regular users (2 users per property)
        users = []
        user_credentials = [
            ('WBW_U1', 'WBW_U2', 'Wingate by Wyndham'),
            ('RBW_U1', 'RBW_U2', 'Ramada by Wyndham'),
            ('FIA_U1', 'FIA_U2', 'Fairfield Inn & Suites Avon'),
            ('CAF_U1', 'CAF_U2', 'Courtyard Akron Fairlawn'),
            ('FIC_U1', 'FIC_U2', 'Fairfield Inn & Suites Canton'),
            ('RIC_U1', 'RIC_U2', 'Residence Inn Canton'),
            ('HIM_U1', 'HIM_U2', 'Hampton Inn Mansfield'),
            ('FIM_U1', 'FIM_U2', 'Fairfield Inn & Suites Mansfield')
        ]
        
        for user1, user2, _ in user_credentials:
            users.extend([
                User(username=user1, email=f"{user1.lower()}@example.net", password=f"{user1.lower()}123", role='user'),
                User(username=user2, email=f"{user2.lower()}@example.net", password=f"{user2.lower()}123", role='user')
            ])

        all_users = [admin] + managers + users
        db.session.add_all(all_users)
        db.session.commit()

        # Create Rooms for each property
        room_types = ['Single', 'Double', 'Suite', 'Presidential Suite', 'Conference Room']
        room_statuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning']
        floors = [1, 2, 3, 4]

        rooms = []
        for prop in properties:
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
        
        # Assign properties to managers (one property each)
        for manager, prop in zip(managers, properties):
            manager.assigned_properties = [prop]  # Managers get exactly one property
            prop.manager_id = manager.user_id
        
        # Assign properties to users (2-3 properties each)
        for i, prop in enumerate(properties):
            # Get the two users for this property
            user1 = users[i * 2]
            user2 = users[i * 2 + 1]
            
            # Always assign their main property
            user1.assigned_properties.append(prop)
            user2.assigned_properties.append(prop)
            
            # Assign 1-2 additional random properties
            other_properties = [p for p in properties if p != prop]
            for user in [user1, user2]:
                num_extra = random.randint(1, 2)
                extra_properties = random.sample(other_properties, num_extra)
                for extra_prop in extra_properties:
                    user.assigned_properties.append(extra_prop)
        
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
        for prop in properties:
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
        for prop in properties:
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

        # Create Property Themes
        themes = [PropertyTheme(property_id=prop.property_id) for prop in properties]
        db.session.add_all(themes)
        db.session.commit()

        # Create System Settings
        system_settings = SystemSettings()
        db.session.add(system_settings)
        db.session.commit()

        print("Database initialized with test data!")

if __name__ == '__main__':
    setup_database() 