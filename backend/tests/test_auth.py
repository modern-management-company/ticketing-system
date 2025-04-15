import pytest
from app.models import User
from tests.utils import assert_response_status, assert_error_response

def test_login_success(test_client, test_user):
    """Test successful login."""
    response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'access_token' in data
    assert 'refresh_token' in data

def test_login_invalid_credentials(test_client):
    """Test login with invalid credentials."""
    response = test_client.post('/auth/login', json={
        'email': 'invalid@example.com',
        'password': 'wrongpassword'
    })
    assert_error_response(response, 401, 'Invalid email or password')

def test_register_success(test_client, test_db):
    """Test successful user registration."""
    response = test_client.post('/auth/register', json={
        'username': 'newuser',
        'email': 'newuser@example.com',
        'password': 'password123',
        'role': 'user',
        'group': 'Engineering'
    })
    assert_response_status(response, 201)
    data = response.get_json()
    assert 'message' in data
    assert data['message'] == 'User registered successfully'

    # Verify user was created
    user = User.query.filter_by(email='newuser@example.com').first()
    assert user is not None
    assert user.username == 'newuser'
    assert user.role == 'user'

def test_register_duplicate_email(test_client, test_user):
    """Test registration with duplicate email."""
    response = test_client.post('/auth/register', json={
        'username': 'anotheruser',
        'email': test_user.email,  # Using existing email
        'password': 'password123',
        'role': 'user',
        'group': 'Engineering'
    })
    assert_error_response(response, 400, 'Email already registered')

def test_refresh_token(test_client, test_user):
    """Test token refresh."""
    # First login to get refresh token
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    refresh_token = login_response.get_json()['refresh_token']

    # Use refresh token to get new access token
    response = test_client.post('/auth/refresh', headers={
        'Authorization': f'Bearer {refresh_token}'
    })
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'access_token' in data

def test_logout(test_client, test_user):
    """Test user logout."""
    # First login to get token
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'password123'
    })
    access_token = login_response.get_json()['access_token']

    # Logout
    response = test_client.post('/auth/logout', headers={
        'Authorization': f'Bearer {access_token}'
    })
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'message' in data
    assert data['message'] == 'Successfully logged out'

def test_password_reset_request(test_client, test_user):
    """Test password reset request."""
    response = test_client.post('/auth/reset-password-request', json={
        'email': test_user.email
    })
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'message' in data
    assert data['message'] == 'Password reset email sent'

def test_password_reset(test_client, test_user):
    """Test password reset."""
    # First get reset token (in real app this would be sent via email)
    reset_token = test_user.get_reset_password_token()
    
    response = test_client.post('/auth/reset-password', json={
        'token': reset_token,
        'new_password': 'newpassword123'
    })
    assert_response_status(response, 200)
    data = response.get_json()
    assert 'message' in data
    assert data['message'] == 'Password has been reset'

    # Verify new password works
    login_response = test_client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'newpassword123'
    })
    assert_response_status(login_response, 200) 