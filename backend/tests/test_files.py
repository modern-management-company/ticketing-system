import pytest
import os
from werkzeug.datastructures import FileStorage
from tests.utils import assert_response_status, get_auth_headers

def test_upload_ticket_attachment(test_client, test_user):
    """Test uploading an attachment to a ticket."""
    # Login as user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    # Create a ticket first
    ticket_response = test_client.post('/tickets', json={
        'title': 'Test Ticket',
        'description': 'Test description',
        'priority': 'high',
        'category': 'maintenance'
    }, headers=get_auth_headers(user_token))
    ticket_id = ticket_response.get_json()['ticket_id']

    # Create a test file
    test_file = FileStorage(
        stream=open('tests/test_file.txt', 'rb'),
        filename='test_file.txt',
        content_type='text/plain'
    )

    # Upload the file
    response = test_client.post(
        f'/tickets/{ticket_id}/attachments',
        data={'file': test_file},
        headers=get_auth_headers(user_token)
    )
    assert_response_status(response, 201)
    data = response.get_json()
    assert 'attachment' in data
    assert data['attachment']['filename'] == 'test_file.txt'
    assert data['attachment']['ticket_id'] == ticket_id

def test_get_ticket_attachments(test_client, test_user):
    """Test getting ticket attachments."""
    # Login as user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    # Create a ticket with an attachment
    ticket_response = test_client.post('/tickets', json={
        'title': 'Test Ticket',
        'description': 'Test description',
        'priority': 'high',
        'category': 'maintenance'
    }, headers=get_auth_headers(user_token))
    ticket_id = ticket_response.get_json()['ticket_id']

    # Upload a file
    test_file = FileStorage(
        stream=open('tests/test_file.txt', 'rb'),
        filename='test_file.txt',
        content_type='text/plain'
    )
    test_client.post(
        f'/tickets/{ticket_id}/attachments',
        data={'file': test_file},
        headers=get_auth_headers(user_token)
    )

    # Get attachments
    response = test_client.get(
        f'/tickets/{ticket_id}/attachments',
        headers=get_auth_headers(user_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'attachments' in data
    assert len(data['attachments']) >= 1
    assert data['attachments'][0]['filename'] == 'test_file.txt'

def test_delete_ticket_attachment(test_client, test_user):
    """Test deleting a ticket attachment."""
    # Login as user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    # Create a ticket with an attachment
    ticket_response = test_client.post('/tickets', json={
        'title': 'Test Ticket',
        'description': 'Test description',
        'priority': 'high',
        'category': 'maintenance'
    }, headers=get_auth_headers(user_token))
    ticket_id = ticket_response.get_json()['ticket_id']

    # Upload a file
    test_file = FileStorage(
        stream=open('tests/test_file.txt', 'rb'),
        filename='test_file.txt',
        content_type='text/plain'
    )
    upload_response = test_client.post(
        f'/tickets/{ticket_id}/attachments',
        data={'file': test_file},
        headers=get_auth_headers(user_token)
    )
    attachment_id = upload_response.get_json()['attachment']['id']

    # Delete the attachment
    response = test_client.delete(
        f'/tickets/{ticket_id}/attachments/{attachment_id}',
        headers=get_auth_headers(user_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['message'] == 'Attachment deleted successfully'

def test_upload_task_attachment(test_client, test_user, test_manager):
    """Test uploading an attachment to a task."""
    # Create a ticket and task first
    ticket_response = test_client.post('/tickets', json={
        'title': 'Test Ticket',
        'description': 'Test description',
        'priority': 'high',
        'category': 'maintenance'
    }, headers=get_auth_headers(test_user.get_token()))
    ticket_id = ticket_response.get_json()['ticket_id']

    task_response = test_client.post(f'/tickets/{ticket_id}/assign', json={
        'assigned_to_id': test_manager.user_id,
        'due_date': '2024-01-08T00:00:00Z',
        'task_title': 'Fix the issue'
    }, headers=get_auth_headers(test_user.get_token()))
    task_id = task_response.get_json()['task_id']

    # Login as manager
    login_response = test_client.post('/auth/login', json={
        'email': test_manager.email,
        'password': 'password123'
    })
    manager_token = login_response.get_json()['access_token']

    # Upload a file to the task
    test_file = FileStorage(
        stream=open('tests/test_file.txt', 'rb'),
        filename='test_file.txt',
        content_type='text/plain'
    )

    response = test_client.post(
        f'/tasks/{task_id}/attachments',
        data={'file': test_file},
        headers=get_auth_headers(manager_token)
    )
    assert_response_status(response, 201)
    data = response.get_json()
    assert 'attachment' in data
    assert data['attachment']['filename'] == 'test_file.txt'
    assert data['attachment']['task_id'] == task_id

def test_get_task_attachments(test_client, test_user, test_manager):
    """Test getting task attachments."""
    # Create a ticket and task with an attachment
    ticket_response = test_client.post('/tickets', json={
        'title': 'Test Ticket',
        'description': 'Test description',
        'priority': 'high',
        'category': 'maintenance'
    }, headers=get_auth_headers(test_user.get_token()))
    ticket_id = ticket_response.get_json()['ticket_id']

    task_response = test_client.post(f'/tickets/{ticket_id}/assign', json={
        'assigned_to_id': test_manager.user_id,
        'due_date': '2024-01-08T00:00:00Z',
        'task_title': 'Fix the issue'
    }, headers=get_auth_headers(test_user.get_token()))
    task_id = task_response.get_json()['task_id']

    # Login as manager and upload a file
    login_response = test_client.post('/auth/login', json={
        'email': test_manager.email,
        'password': 'password123'
    })
    manager_token = login_response.get_json()['access_token']

    test_file = FileStorage(
        stream=open('tests/test_file.txt', 'rb'),
        filename='test_file.txt',
        content_type='text/plain'
    )
    test_client.post(
        f'/tasks/{task_id}/attachments',
        data={'file': test_file},
        headers=get_auth_headers(manager_token)
    )

    # Get attachments
    response = test_client.get(
        f'/tasks/{task_id}/attachments',
        headers=get_auth_headers(manager_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'attachments' in data
    assert len(data['attachments']) >= 1
    assert data['attachments'][0]['filename'] == 'test_file.txt' 