import pytest
from datetime import datetime, timedelta
from app.models import Ticket, Task
from tests.utils import (
    assert_response_status,
    assert_error_response,
    get_auth_headers,
    create_test_ticket,
    create_test_task
)

def test_create_ticket(test_client, test_user, test_property, test_room):
    """Test creating a new ticket."""
    # Login as user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    ticket_data = {
        'title': 'New Ticket',
        'description': 'This is a new ticket',
        'priority': 'high',
        'category': 'maintenance',
        'subcategory': 'plumbing',
        'property_id': test_property.property_id,
        'room_id': test_room.room_id
    }

    response = test_client.post(
        '/tickets',
        json=ticket_data,
        headers=get_auth_headers(user_token)
    )
    assert_response_status(response, 201)
    data = response.get_json()
    assert data['title'] == ticket_data['title']
    assert data['description'] == ticket_data['description']
    assert data['priority'] == ticket_data['priority']
    assert data['category'] == ticket_data['category']
    assert data['subcategory'] == ticket_data['subcategory']
    assert data['property_id'] == ticket_data['property_id']
    assert data['room_id'] == ticket_data['room_id']
    assert data['status'] == 'open'  # Default status

def test_get_tickets(test_client, test_admin, test_user):
    """Test getting all tickets."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    # Create a test ticket
    create_test_ticket(test_client, test_user.get_token())

    response = test_client.get('/tickets', headers=get_auth_headers(admin_token))
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'tickets' in data
    assert len(data['tickets']) >= 1

def test_get_ticket_by_id(test_client, test_admin, test_user):
    """Test getting a specific ticket."""
    # Login as user and create a ticket
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    ticket_response = create_test_ticket(test_client, user_token)
    ticket_id = ticket_response.get_json()['ticket_id']

    # Login as admin and get the ticket
    admin_login = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = admin_login.get_json()['access_token']

    response = test_client.get(
        f'/tickets/{ticket_id}',
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['ticket_id'] == ticket_id
    assert data['title'] == 'Test Ticket'

def test_update_ticket(test_client, test_admin, test_user):
    """Test updating a ticket."""
    # Login as user and create a ticket
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    ticket_response = create_test_ticket(test_client, user_token)
    ticket_id = ticket_response.get_json()['ticket_id']

    # Login as admin and update the ticket
    admin_login = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = admin_login.get_json()['access_token']

    update_data = {
        'title': 'Updated Ticket',
        'description': 'Updated description',
        'priority': 'medium',
        'status': 'in_progress'
    }

    response = test_client.put(
        f'/tickets/{ticket_id}',
        json=update_data,
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['title'] == update_data['title']
    assert data['description'] == update_data['description']
    assert data['priority'] == update_data['priority']
    assert data['status'] == update_data['status']

def test_delete_ticket(test_client, test_admin, test_user):
    """Test deleting a ticket."""
    # Login as user and create a ticket
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    ticket_response = create_test_ticket(test_client, user_token)
    ticket_id = ticket_response.get_json()['ticket_id']

    # Login as admin and delete the ticket
    admin_login = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = admin_login.get_json()['access_token']

    response = test_client.delete(
        f'/tickets/{ticket_id}',
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['message'] == 'Ticket deleted successfully'

def test_assign_ticket_to_task(test_client, test_admin, test_user):
    """Test assigning a ticket to a task."""
    # Login as user and create a ticket
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    ticket_response = create_test_ticket(test_client, user_token)
    ticket_id = ticket_response.get_json()['ticket_id']

    # Login as admin and assign the ticket
    admin_login = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = admin_login.get_json()['access_token']

    task_data = {
        'assigned_to_id': test_user.user_id,
        'due_date': (datetime.utcnow() + timedelta(days=7)).isoformat(),
        'task_title': 'Fix the issue'
    }

    response = test_client.post(
        f'/tickets/{ticket_id}/assign',
        json=task_data,
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 201)
    data = response.get_json()
    assert data['title'] == task_data['task_title']
    assert data['assigned_to_id'] == task_data['assigned_to_id']
    assert data['ticket_id'] == ticket_id

def test_get_tasks(test_client, test_admin, test_user):
    """Test getting all tasks."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    # Create a test ticket and task
    ticket_response = create_test_ticket(test_client, test_user.get_token())
    ticket_id = ticket_response.get_json()['ticket_id']
    create_test_task(test_client, admin_token, ticket_id)

    response = test_client.get('/tasks', headers=get_auth_headers(admin_token))
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'tasks' in data
    assert len(data['tasks']) >= 1

def test_update_task(test_client, test_admin, test_user):
    """Test updating a task."""
    # Create a ticket and task
    ticket_response = create_test_ticket(test_client, test_user.get_token())
    ticket_id = ticket_response.get_json()['ticket_id']
    task_response = create_test_task(test_client, test_admin.get_token(), ticket_id)
    task_id = task_response.get_json()['task_id']

    update_data = {
        'title': 'Updated Task',
        'description': 'Updated task description',
        'status': 'in_progress',
        'due_date': (datetime.utcnow() + timedelta(days=14)).isoformat()
    }

    response = test_client.put(
        f'/tasks/{task_id}',
        json=update_data,
        headers=get_auth_headers(test_admin.get_token())
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['title'] == update_data['title']
    assert data['description'] == update_data['description']
    assert data['status'] == update_data['status']

def test_delete_task(test_client, test_admin, test_user):
    """Test deleting a task."""
    # Create a ticket and task
    ticket_response = create_test_ticket(test_client, test_user.get_token())
    ticket_id = ticket_response.get_json()['ticket_id']
    task_response = create_test_task(test_client, test_admin.get_token(), ticket_id)
    task_id = task_response.get_json()['task_id']

    response = test_client.delete(
        f'/tasks/{task_id}',
        headers=get_auth_headers(test_admin.get_token())
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['message'] == 'Task deleted successfully' 