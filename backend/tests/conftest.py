import os
import pytest
from app import create_app
from app.extensions import db
from app.models import User, Role, Property, Room, Ticket, Task
from datetime import datetime, timedelta

@pytest.fixture(scope='function')
def app():
    """Create and configure a new app instance for each test."""
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    app = create_app('testing')
    
    # Create the database and load test data
    with app.app_context():
        db.create_all()
    
    yield app
    
    # Clean up
    with app.app_context():
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def runner(app):
    return app.test_cli_runner()

@pytest.fixture
def init_database(app):
    """Initialize test database with sample data."""
    with app.app_context():
        # Create roles
        admin_role = Role(name='admin')
        manager_role = Role(name='manager')
        user_role = Role(name='user')
        db.session.add_all([admin_role, manager_role, user_role])
        db.session.commit()

        # Create users
        admin = User(
            email='admin@test.com',
            password='password123',
            first_name='Admin',
            last_name='User',
            role_id=admin_role.id
        )
        manager = User(
            email='manager@test.com',
            password='password123',
            first_name='Manager',
            last_name='User',
            role_id=manager_role.id
        )
        user = User(
            email='user@test.com',
            password='password123',
            first_name='Regular',
            last_name='User',
            role_id=user_role.id
        )
        db.session.add_all([admin, manager, user])
        db.session.commit()

        # Create property
        property = Property(
            name='Test Property',
            address='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345',
            created_by=admin.id
        )
        db.session.add(property)
        db.session.commit()

        # Create room
        room = Room(
            name='Test Room',
            floor='1',
            room_number='101',
            property_id=property.id,
            created_by=admin.id
        )
        db.session.add(room)
        db.session.commit()

        # Create ticket
        ticket = Ticket(
            title='Test Ticket',
            description='This is a test ticket',
            priority='high',
            category='maintenance',
            subcategory='plumbing',
            property_id=property.id,
            room_id=room.id,
            created_by=user.id
        )
        db.session.add(ticket)
        db.session.commit()

        # Create task
        task = Task(
            title='Test Task',
            description='This is a test task',
            due_date=datetime.utcnow() + timedelta(days=7),
            assigned_to=manager.id,
            ticket_id=ticket.id,
            created_by=admin.id
        )
        db.session.add(task)
        db.session.commit()

        yield

        # Clean up
        db.session.remove()
        db.drop_all() 