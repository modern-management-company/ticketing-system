from app import app, db
from app.models import User, Property, Ticket, TaskAssignment, Room
from werkzeug.security import generate_password_hash
from datetime import datetime
from sqlalchemy import text

def clear_database():
    with app.app_context():
        # Drop all tables with CASCADE to handle dependencies
        db.session.execute(text('DROP TABLE IF EXISTS activities CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS task_assignments CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS tickets CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS rooms CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS user_properties CASCADE'))
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
        users = [
            User(username='admin', password=generate_password_hash('admin123'), role='super_admin'),
            User(username='mrinn', password=generate_password_hash('mrinn123'), role='manager', managed_property_id=residence_inn.property_id),
            User(username='mff', password=generate_password_hash('mff123'), role='manager', managed_property_id=fairfield_inn.property_id),
            User(username='urinn', password=generate_password_hash('urinn123'), role='user'),
            User(username='uff', password=generate_password_hash('uff123'), role='user'),
            User(username='user', password=generate_password_hash('user123'), role='user')
        ]
        db.session.add_all(users)
        db.session.commit()

        # Assign properties to users
        urinn = users[3]  # urinn
        uff = users[4]    # uff
        user = users[5]   # user

        # Create property assignments
        urinn.assigned_properties.append(residence_inn)
        uff.assigned_properties.append(fairfield_inn)
        user.assigned_properties.append(residence_inn)
        
        db.session.commit()

        # Create Tickets
        tickets = [
            # Residence Inn Tickets
            Ticket(
                title='AC not working in room 101',
                description='The air conditioning unit is making loud noises and not cooling properly',
                status='Open',
                priority='High',
                category='Maintenance',
                property_id=residence_inn.property_id,
                user_id=users[3].user_id,  # urinn
                room_id=rooms[0].room_id  # Room 101 of Residence Inn
            ),
            Ticket(
                title='Water leak in bathroom',
                description='Water leaking from ceiling in room 203 bathroom',
                status='Open',
                priority='Critical',
                category='Maintenance',
                property_id=residence_inn.property_id,
                user_id=users[3].user_id,  # urinn
                room_id=rooms[1].room_id  # Room 102 of Residence Inn
            ),
            # Fairfield Inn Tickets
            Ticket(
                title='Light fixtures broken',
                description='Multiple light fixtures not working in lobby area',
                status='Open',
                priority='Medium',
                category='Maintenance',
                property_id=fairfield_inn.property_id,
                user_id=users[4].user_id,  # uff
                room_id=rooms[4].room_id  # Room 101 of Fairfield Inn
            ),
            Ticket(
                title='Damaged table in conference room',
                description='Large scratch marks on conference room table',
                status='Open',
                priority='Low',
                category='Furniture',
                property_id=fairfield_inn.property_id,
                user_id=users[4].user_id,  # uff
                room_id=rooms[5].room_id  # Room 102 of Fairfield Inn
            )
        ]
        db.session.add_all(tickets)
        db.session.commit()

        # Create Tasks
        tasks = [
            TaskAssignment(
                ticket_id=tickets[0].ticket_id,  # AC issue
                assigned_to_user_id=users[3].user_id,  # urinn
                status='Pending'
            ),
            TaskAssignment(
                ticket_id=tickets[1].ticket_id,  # Water leak
                assigned_to_user_id=users[3].user_id,  # urinn
                status='Pending'
            ),
            TaskAssignment(
                ticket_id=tickets[2].ticket_id,  # Light fixtures
                assigned_to_user_id=users[4].user_id,  # uff
                status='Pending'
            ),
            TaskAssignment(
                ticket_id=tickets[3].ticket_id,  # Damaged table
                assigned_to_user_id=users[4].user_id,  # uff
                status='Pending'
            )
        ]
        db.session.add_all(tasks)
        db.session.commit()

        print("Database initialized with test data!")

if __name__ == '__main__':
    setup_database() 