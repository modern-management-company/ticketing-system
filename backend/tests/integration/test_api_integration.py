import pytest
from datetime import datetime, timedelta
from backend.tests.utils import get_auth_headers, get_test_user
from app.models import Ticket, Task, User, Notification

def test_complete_ticket_lifecycle(client, init_database):
    """Test the complete lifecycle of a ticket from creation to resolution."""
    # Get authentication headers for different user roles
    admin_headers = get_auth_headers('admin@test.com')
    manager_headers = get_auth_headers('manager@test.com')
    user_headers = get_auth_headers('user@test.com')

    # Step 1: User creates a ticket
    ticket_data = {
        'title': 'Integration Test Ticket',
        'description': 'Testing complete ticket lifecycle',
        'priority': 'high',
        'category': 'maintenance',
        'subcategory': 'plumbing',
        'property_id': 1,
        'room_id': 1
    }
    response = client.post('/api/tickets', json=ticket_data, headers=user_headers)
    assert response.status_code == 201
    ticket_id = response.json['id']

    # Step 2: Admin assigns ticket to manager
    task_data = {
        'title': 'Handle plumbing issue',
        'description': 'Please investigate and fix the plumbing issue',
        'due_date': (datetime.utcnow() + timedelta(days=2)).isoformat(),
        'assigned_to': 2  # Manager's ID
    }
    response = client.post(f'/api/tickets/{ticket_id}/tasks', json=task_data, headers=admin_headers)
    assert response.status_code == 201
    task_id = response.json['id']

    # Step 3: Manager updates task progress
    update_data = {
        'status': 'in_progress',
        'notes': 'Started investigating the issue'
    }
    response = client.put(f'/api/tasks/{task_id}', json=update_data, headers=manager_headers)
    assert response.status_code == 200

    # Step 4: Manager adds comment to ticket
    comment_data = {
        'content': 'Found the issue, ordering replacement parts'
    }
    response = client.post(f'/api/tickets/{ticket_id}/comments', json=comment_data, headers=manager_headers)
    assert response.status_code == 201

    # Step 5: Manager completes task
    complete_data = {
        'status': 'completed',
        'notes': 'Replaced faulty valve and tested water flow'
    }
    response = client.put(f'/api/tasks/{task_id}', json=complete_data, headers=manager_headers)
    assert response.status_code == 200

    # Step 6: Admin closes the ticket
    close_data = {
        'status': 'closed',
        'resolution_notes': 'Issue resolved successfully'
    }
    response = client.put(f'/api/tickets/{ticket_id}', json=close_data, headers=admin_headers)
    assert response.status_code == 200

    # Verify final state
    response = client.get(f'/api/tickets/{ticket_id}', headers=user_headers)
    assert response.status_code == 200
    assert response.json['status'] == 'closed'

def test_notification_integration(client, init_database):
    """Test the notification system integration with ticket and task operations."""
    admin_headers = get_auth_headers('admin@test.com')
    user_headers = get_auth_headers('user@test.com')

    # Create a ticket and verify notifications
    ticket_data = {
        'title': 'Notification Test Ticket',
        'description': 'Testing notification system',
        'priority': 'high',
        'category': 'maintenance',
        'subcategory': 'electrical',
        'property_id': 1,
        'room_id': 1
    }
    response = client.post('/api/tickets', json=ticket_data, headers=user_headers)
    assert response.status_code == 201
    ticket_id = response.json['id']

    # Check admin notification
    response = client.get('/api/notifications', headers=admin_headers)
    assert response.status_code == 200
    notifications = response.json
    assert any(n['type'] == 'new_ticket' for n in notifications)

    # Assign task and verify manager notification
    task_data = {
        'title': 'Check electrical issue',
        'description': 'Investigate and fix electrical problem',
        'due_date': (datetime.utcnow() + timedelta(days=1)).isoformat(),
        'assigned_to': 2
    }
    response = client.post(f'/api/tickets/{ticket_id}/tasks', json=task_data, headers=admin_headers)
    assert response.status_code == 201

    # Check manager notification
    manager_headers = get_auth_headers('manager@test.com')
    response = client.get('/api/notifications', headers=manager_headers)
    assert response.status_code == 200
    notifications = response.json
    assert any(n['type'] == 'task_assigned' for n in notifications)

def test_file_upload_integration(client, init_database):
    """Test file upload integration with tickets and tasks."""
    from io import BytesIO
    manager_headers = get_auth_headers('manager@test.com')

    # Create a test file
    file_content = b'Test file content'
    file = (BytesIO(file_content), 'test.txt')

    # Upload file to ticket
    response = client.post('/api/tickets/1/files', 
                          data={'file': file},
                          headers=manager_headers,
                          content_type='multipart/form-data')
    assert response.status_code == 201
    file_id = response.json['id']

    # Verify file attachment
    response = client.get('/api/tickets/1/files', headers=manager_headers)
    assert response.status_code == 200
    assert any(f['id'] == file_id for f in response.json)

def test_report_generation_integration(client, init_database):
    """Test the complete report generation process."""
    admin_headers = get_auth_headers('admin@test.com')

    # Generate various reports
    report_types = ['ticket_summary', 'task_completion', 'response_time']
    
    for report_type in report_types:
        response = client.post('/api/reports', 
                             json={
                                 'type': report_type,
                                 'start_date': (datetime.utcnow() - timedelta(days=30)).isoformat(),
                                 'end_date': datetime.utcnow().isoformat()
                             },
                             headers=admin_headers)
        assert response.status_code == 201
        assert 'report_url' in response.json

        # Verify report download
        report_url = response.json['report_url']
        response = client.get(report_url, headers=admin_headers)
        assert response.status_code == 200 