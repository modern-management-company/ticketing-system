import pytest
from unittest.mock import patch
from app.models import Notification
from tests.utils import assert_response_status, get_auth_headers

@patch('app.services.email_service.send_email')
@patch('app.services.sms_service.send_sms')
def test_ticket_creation_notification(mock_send_sms, mock_send_email, test_client, test_user, test_admin):
    """Test notification when a ticket is created."""
    # Login as user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    # Create a ticket
    ticket_data = {
        'title': 'New Ticket',
        'description': 'This is a new ticket',
        'priority': 'high',
        'category': 'maintenance'
    }

    response = test_client.post(
        '/tickets',
        json=ticket_data,
        headers=get_auth_headers(user_token)
    )
    assert_response_status(response, 201)

    # Verify email was sent to admin
    mock_send_email.assert_called_once()
    email_call = mock_send_email.call_args[0]
    assert email_call[0] == test_admin.email
    assert 'New Ticket Created' in email_call[1]
    assert ticket_data['title'] in email_call[2]

    # Verify SMS was sent if enabled
    if test_admin.phone_number:
        mock_send_sms.assert_called_once()
        sms_call = mock_send_sms.call_args[0]
        assert sms_call[0] == test_admin.phone_number
        assert 'New Ticket' in sms_call[1]

@patch('app.services.email_service.send_email')
@patch('app.services.sms_service.send_sms')
def test_task_assignment_notification(mock_send_sms, mock_send_email, test_client, test_user, test_manager):
    """Test notification when a task is assigned."""
    # Create a ticket first
    ticket_response = test_client.post('/tickets', json={
        'title': 'Test Ticket',
        'description': 'Test description',
        'priority': 'high',
        'category': 'maintenance'
    }, headers=get_auth_headers(test_user.get_token()))
    ticket_id = ticket_response.get_json()['ticket_id']

    # Assign task
    task_data = {
        'assigned_to_id': test_manager.user_id,
        'due_date': '2024-01-08T00:00:00Z',
        'task_title': 'Fix the issue'
    }

    response = test_client.post(
        f'/tickets/{ticket_id}/assign',
        json=task_data,
        headers=get_auth_headers(test_user.get_token())
    )
    assert_response_status(response, 201)

    # Verify email was sent to manager
    mock_send_email.assert_called_once()
    email_call = mock_send_email.call_args[0]
    assert email_call[0] == test_manager.email
    assert 'New Task Assigned' in email_call[1]
    assert task_data['task_title'] in email_call[2]

    # Verify SMS was sent if enabled
    if test_manager.phone_number:
        mock_send_sms.assert_called_once()
        sms_call = mock_send_sms.call_args[0]
        assert sms_call[0] == test_manager.phone_number
        assert 'New Task' in sms_call[1]

@patch('app.services.email_service.send_email')
@patch('app.services.sms_service.send_sms')
def test_ticket_status_change_notification(mock_send_sms, mock_send_email, test_client, test_user, test_manager):
    """Test notification when ticket status changes."""
    # Create a ticket
    ticket_response = test_client.post('/tickets', json={
        'title': 'Test Ticket',
        'description': 'Test description',
        'priority': 'high',
        'category': 'maintenance'
    }, headers=get_auth_headers(test_user.get_token()))
    ticket_id = ticket_response.get_json()['ticket_id']

    # Update ticket status
    update_data = {
        'status': 'in_progress'
    }

    response = test_client.put(
        f'/tickets/{ticket_id}',
        json=update_data,
        headers=get_auth_headers(test_manager.get_token())
    )
    assert_response_status(response, 200)

    # Verify email was sent to ticket creator
    mock_send_email.assert_called_once()
    email_call = mock_send_email.call_args[0]
    assert email_call[0] == test_user.email
    assert 'Ticket Status Updated' in email_call[1]
    assert update_data['status'] in email_call[2]

    # Verify SMS was sent if enabled
    if test_user.phone_number:
        mock_send_sms.assert_called_once()
        sms_call = mock_send_sms.call_args[0]
        assert sms_call[0] == test_user.phone_number
        assert 'Status Updated' in sms_call[1]

def test_get_user_notifications(test_client, test_user):
    """Test getting user notifications."""
    # Login as user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    # Create some notifications
    notifications = [
        Notification(
            user_id=test_user.user_id,
            title='Test Notification 1',
            message='This is a test notification',
            type='info'
        ),
        Notification(
            user_id=test_user.user_id,
            title='Test Notification 2',
            message='Another test notification',
            type='warning'
        )
    ]
    for notification in notifications:
        test_user.notifications.append(notification)

    response = test_client.get(
        '/notifications',
        headers=get_auth_headers(user_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'notifications' in data
    assert len(data['notifications']) >= 2

def test_mark_notification_as_read(test_client, test_user):
    """Test marking a notification as read."""
    # Login as user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    # Create a notification
    notification = Notification(
        user_id=test_user.user_id,
        title='Test Notification',
        message='This is a test notification',
        type='info'
    )
    test_user.notifications.append(notification)

    response = test_client.put(
        f'/notifications/{notification.notification_id}/read',
        headers=get_auth_headers(user_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['message'] == 'Notification marked as read'
    assert notification.read is True 