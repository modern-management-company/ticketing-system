from app import app, db
from app.models import User, Property, Ticket, Task, TaskAssignment, Room, PropertyTheme, SystemSettings
from werkzeug.security import generate_password_hash
from datetime import datetime
from sqlalchemy import text

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
        residence_inn = Property(
            name='Residence Inn',
            address='123 Main St',
            type='Hotel'
        )
        fairfield_inn = Property(
            name='Fairfield Inn',
            address='456 Oak Ave',
            type='Hotel'
        )
        db.session.add_all([residence_inn, fairfield_inn])
        db.session.commit()

        # Create Rooms for each property
        rooms = []
        for property in [residence_inn, fairfield_inn]:
            for room_number in ['101', '102', '103', '104']:
                room = Room(
                    name=f'Room {room_number}',
                    property_id=property.property_id
                )
                rooms.append(room)
        
        db.session.add_all(rooms)
        db.session.commit()

        # Create Users
        admin = User(username='admin', email="admin@example.net", password='admin123', role='super_admin')
        mrinn = User(username='mrinn', email="mrinn@example.net", password='mrinn123', role='manager')
        mff = User(username='mff', email="mff@example.net", password='mff123', role='manager')
        urinn = User(username='urinn', email="urinn@example.net", password='urinn123', role='user')
        uff = User(username='uff', email="uff@example.net", password='uff123', role='user')
        user = User(username='user', email="user@example.net", password='user123', role='user')

        users = [admin, mrinn, mff, urinn, uff, user]
        db.session.add_all(users)
        db.session.commit()

        # Set property managers
        residence_inn.manager_id = mrinn.user_id
        fairfield_inn.manager_id = mff.user_id
        db.session.commit()

        # Assign properties to users
        urinn.assigned_properties.append(residence_inn)
        uff.assigned_properties.append(fairfield_inn)
        user.assigned_properties.append(residence_inn)
        
        db.session.commit()

        # Create Property Themes
        themes = [
            PropertyTheme(property_id=residence_inn.property_id),
            PropertyTheme(property_id=fairfield_inn.property_id)
        ]
        db.session.add_all(themes)
        db.session.commit()

        # Create System Settings
        system_settings = SystemSettings()
        db.session.add(system_settings)
        db.session.commit()

        # Create Tickets
        tickets = [
            # Residence Inn Tickets
            Ticket(
                title='AC not working in room 101',
                description='The air conditioning unit is making loud noises and not cooling properly',
                status='open',
                priority='High',
                category='Maintenance',
                property_id=residence_inn.property_id,
                user_id=urinn.user_id,
                room_id=rooms[0].room_id
            ),
            Ticket(
                title='Water leak in bathroom',
                description='Water leaking from ceiling in room 203 bathroom',
                status='open',
                priority='Critical',
                category='Maintenance',
                property_id=residence_inn.property_id,
                user_id=urinn.user_id,
                room_id=rooms[1].room_id
            ),
            # Fairfield Inn Tickets
            Ticket(
                title='Light fixtures broken',
                description='Multiple light fixtures not working in lobby area',
                status='open',
                priority='Medium',
                category='Maintenance',
                property_id=fairfield_inn.property_id,
                user_id=uff.user_id,
                room_id=rooms[4].room_id
            ),
            Ticket(
                title='Damaged table in conference room',
                description='Large scratch marks on conference room table',
                status='open',
                priority='Low',
                category='Furniture',
                property_id=fairfield_inn.property_id,
                user_id=uff.user_id,
                room_id=rooms[5].room_id
            )
        ]
        db.session.add_all(tickets)
        db.session.commit()

        # Create Tasks
        tasks = [
            Task(
                title='Fix AC in Room 101',
                description='Inspect and repair AC unit',
                status='pending',
                priority='High',
                property_id=residence_inn.property_id,
                assigned_to_id=urinn.user_id
            ),
            Task(
                title='Investigate Water Leak',
                description='Find source of leak and repair',
                status='pending',
                priority='Critical',
                property_id=residence_inn.property_id,
                assigned_to_id=urinn.user_id
            ),
            Task(
                title='Replace Light Fixtures',
                description='Replace broken light fixtures in lobby',
                status='pending',
                priority='Medium',
                property_id=fairfield_inn.property_id,
                assigned_to_id=uff.user_id
            ),
            Task(
                title='Repair Conference Table',
                description='Sand and refinish damaged table',
                status='pending',
                priority='Low',
                property_id=fairfield_inn.property_id,
                assigned_to_id=uff.user_id
            )
        ]
        db.session.add_all(tasks)
        db.session.commit()

        print("Database initialized with test data!")

if __name__ == '__main__':
    setup_database() 