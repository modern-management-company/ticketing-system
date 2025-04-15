import pytest
from app.models import User
from tests.utils import assert_response_status, assert_error_response, get_auth_headers

def test_get_users(test_client, test_admin, test_user, test_manager):
    """Test getting all users."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    response = test_client.get('/users', headers=get_auth_headers(admin_token))
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'users' in data
    assert len(data['users']) >= 3  # Should have at least our test users

def test_get_user_by_id(test_client, test_admin, test_user):
    """Test getting a specific user."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    response = test_client.get(f'/users/{test_user.user_id}', headers=get_auth_headers(admin_token))
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['username'] == test_user.username
    assert data['email'] == test_user.email
    assert data['role'] == test_user.role

def test_update_user(test_client, test_admin, test_user):
    """Test updating a user."""
    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    new_data = {
        'username': 'updated_username',
        'email': 'updated@example.com',
        'role': 'manager',
        'group': 'Maintenance'
    }

    response = test_client.put(
        f'/users/{test_user.user_id}',
        json=new_data,
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['username'] == new_data['username']
    assert data['email'] == new_data['email']
    assert data['role'] == new_data['role']
    assert data['group'] == new_data['group']

def test_delete_user(test_client, test_admin, test_db):
    """Test deleting a user."""
    # Create a user to delete
    user_to_delete = User(
        username='delete_me',
        email='delete@example.com',
        password='password123',
        role='user'
    )
    test_db.session.add(user_to_delete)
    test_db.session.commit()

    # Login as admin
    login_response = test_client.post('/auth/login', json={
        'email': test_admin.email,
        'password': 'password123'
    })
    admin_token = login_response.get_json()['access_token']

    response = test_client.delete(
        f'/users/{user_to_delete.user_id}',
        headers=get_auth_headers(admin_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['message'] == 'User deleted successfully'

    # Verify user was deleted
    deleted_user = User.query.get(user_to_delete.user_id)
    assert deleted_user is None

def test_update_user_unauthorized(test_client, test_user):
    """Test updating a user without proper authorization."""
    # Login as regular user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    response = test_client.put(
        f'/users/{test_user.user_id}',
        json={'role': 'admin'},
        headers=get_auth_headers(user_token)
    )
    assert_error_response(response, 403, 'Insufficient permissions')

def test_get_user_profile(test_client, test_user):
    """Test getting user's own profile."""
    # Login as user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    response = test_client.get('/users/profile', headers=get_auth_headers(user_token))
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['username'] == test_user.username
    assert data['email'] == test_user.email
    assert data['role'] == test_user.role

def test_update_user_profile(test_client, test_user):
    """Test updating user's own profile."""
    # Login as user
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    user_token = login_response.get_json()['access_token']

    new_data = {
        'username': 'new_username',
        'email': 'new_email@example.com'
    }

    response = test_client.put(
        '/users/profile',
        json=new_data,
        headers=get_auth_headers(user_token)
    )
    assert_response_status(response, 200)
    data = response.get_json()
    assert data['username'] == new_data['username']
    assert data['email'] == new_data['email'] 