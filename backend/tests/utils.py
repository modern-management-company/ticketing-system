import json
from datetime import datetime
from flask import url_for, current_app
from app.models import User, Property, Room, Ticket, Task
from app.extensions import db
import jwt
from datetime import datetime, timedelta

def get_test_user(email='user@test.com'):
    """Get a test user by email."""
    return User.query.filter_by(email=email).first()

def get_test_admin():
    """Get the test admin user."""
    return get_test_user('admin@test.com')

def get_test_manager():
    """Get the test manager user."""
    return get_test_user('manager@test.com')

def get_test_property():
    """Get the test property."""
    return Property.query.first()

def get_test_room():
    """Get the test room."""
    return Room.query.first()

def get_test_ticket():
    """Get the test ticket."""
    return Ticket.query.first()

def get_test_task():
    """Get the test task."""
    return Task.query.first()

def generate_token(user_id):
    """Generate a valid JWT token for testing."""
    token = jwt.encode(
        {
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(days=1)
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    return token

def get_auth_headers(user_email='user@test.com'):
    """Get authorization headers for a test user."""
    user = get_test_user(user_email)
    token = generate_token(user.id)
    return {'Authorization': f'Bearer {token}'}

def create_test_ticket(client, token, data=None):
    """Create a test ticket."""
    default_data = {
        'title': 'Test Ticket',
        'description': 'This is a test ticket',
        'priority': 'high',
        'category': 'maintenance',
        'subcategory': 'plumbing'
    }
    if data:
        default_data.update(data)
    
    response = client.post(
        '/tickets',
        json=default_data,
        headers=get_auth_headers(token)
    )
    return response

def create_test_task(client, token, ticket_id, data=None):
    """Create a test task."""
    default_data = {
        'assigned_to_id': 1,  # Default user ID
        'due_date': datetime.utcnow().isoformat(),
        'task_title': 'Test Task'
    }
    if data:
        default_data.update(data)
    
    response = client.post(
        f'/tickets/{ticket_id}/assign',
        json=default_data,
        headers=get_auth_headers(token)
    )
    return response

def assert_response_status(response, expected_status):
    """Assert response status code."""
    assert response.status_code == expected_status, \
        f'Expected status {expected_status}, got {response.status_code}'

def assert_response_data(response, expected_data):
    """Assert response data matches expected data."""
    data = json.loads(response.data)
    for key, value in expected_data.items():
        assert data[key] == value, \
            f'Expected {key} to be {value}, got {data[key]}'

def assert_error_response(response, expected_status, expected_message):
    """Assert error response."""
    assert_response_status(response, expected_status)
    data = json.loads(response.data)
    assert 'error' in data
    assert data['error'] == expected_message 