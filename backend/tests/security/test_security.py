import pytest
import jwt
import re
from datetime import datetime, timedelta
from backend.tests.utils import get_auth_headers, get_test_user

def test_sql_injection_prevention(client, init_database):
    """Test prevention of SQL injection attacks."""
    headers = get_auth_headers('admin@test.com')
    
    # Test SQL injection in login
    sql_injection_attempts = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users; --",
        "' OR '1'='1' --",
        "admin@test.com'; --"
    ]
    
    for attempt in sql_injection_attempts:
        response = client.post('/api/auth/login',
                             json={
                                 'email': attempt,
                                 'password': attempt
                             })
        assert response.status_code in [401, 400], f"SQL injection might be possible with: {attempt}"
    
    # Test SQL injection in query parameters
    response = client.get('/api/users?id=1 OR 1=1', headers=headers)
    assert response.status_code in [400, 404], "SQL injection might be possible in query parameters"

def test_xss_prevention(client, init_database):
    """Test prevention of Cross-Site Scripting (XSS) attacks."""
    headers = get_auth_headers('admin@test.com')
    
    xss_payloads = [
        "<script>alert('xss')</script>",
        "<img src='x' onerror='alert(1)'>",
        "<svg onload='alert(1)'>",
        "javascript:alert(1)"
    ]
    
    # Test XSS in ticket creation
    for payload in xss_payloads:
        response = client.post('/api/tickets',
                             json={
                                 'title': payload,
                                 'description': payload,
                                 'priority': 'high',
                                 'category': 'maintenance',
                                 'property_id': 1,
                                 'room_id': 1
                             },
                             headers=headers)
        assert response.status_code == 201
        
        # Verify response doesn't contain unescaped payload
        assert payload not in response.data.decode()
        assert '&lt;script&gt;' in response.data.decode() or payload not in response.data.decode()

def test_csrf_protection(client, init_database):
    """Test Cross-Site Request Forgery (CSRF) protection."""
    headers = get_auth_headers('admin@test.com')
    
    # Test without CSRF token
    response = client.post('/api/tickets',
                         json={
                             'title': 'Test Ticket',
                             'description': 'Testing CSRF',
                             'priority': 'high',
                             'category': 'maintenance',
                             'property_id': 1,
                             'room_id': 1
                         })
    assert response.status_code in [400, 401, 403], "CSRF protection might be missing"

def test_jwt_security(client, init_database):
    """Test JWT token security."""
    # Test expired token
    expired_token = jwt.encode(
        {
            'user_id': 1,
            'exp': datetime.utcnow() - timedelta(days=1)
        },
        'wrong-secret',
        algorithm='HS256'
    )
    headers = {'Authorization': f'Bearer {expired_token}'}
    response = client.get('/api/tickets', headers=headers)
    assert response.status_code == 401
    
    # Test token with wrong signature
    invalid_token = jwt.encode(
        {
            'user_id': 1,
            'exp': datetime.utcnow() + timedelta(days=1)
        },
        'wrong-secret',
        algorithm='HS256'
    )
    headers = {'Authorization': f'Bearer {invalid_token}'}
    response = client.get('/api/tickets', headers=headers)
    assert response.status_code == 401
    
    # Test token tampering
    valid_headers = get_auth_headers('admin@test.com')
    tampered_token = valid_headers['Authorization'].split()[1] + 'tampered'
    headers = {'Authorization': f'Bearer {tampered_token}'}
    response = client.get('/api/tickets', headers=headers)
    assert response.status_code == 401

def test_password_security(client, init_database):
    """Test password security measures."""
    weak_passwords = [
        'password',
        '12345678',
        'qwerty',
        'admin123',
        'test'
    ]
    
    # Test weak password prevention
    for password in weak_passwords:
        response = client.post('/api/auth/register',
                             json={
                                 'email': 'test@example.com',
                                 'password': password,
                                 'first_name': 'Test',
                                 'last_name': 'User'
                             })
        assert response.status_code == 400, f"Weak password '{password}' was accepted"
    
    # Test password hash exposure
    response = client.get('/api/users', headers=get_auth_headers('admin@test.com'))
    assert response.status_code == 200
    users = response.json
    for user in users:
        assert 'password' not in user, "Password hash exposed in API response"

def test_rate_limiting(client, init_database):
    """Test rate limiting on sensitive endpoints."""
    # Test login rate limiting
    for _ in range(10):
        response = client.post('/api/auth/login',
                             json={
                                 'email': 'admin@test.com',
                                 'password': 'wrong-password'
                             })
    response = client.post('/api/auth/login',
                          json={
                              'email': 'admin@test.com',
                              'password': 'wrong-password'
                          })
    assert response.status_code == 429, "Rate limiting not implemented for login endpoint"
    
    # Test API rate limiting
    headers = get_auth_headers('admin@test.com')
    responses = []
    for _ in range(100):
        response = client.get('/api/tickets', headers=headers)
        responses.append(response.status_code)
    
    assert 429 in responses, "Rate limiting not implemented for API endpoints"

def test_file_upload_security(client, init_database):
    """Test file upload security measures."""
    headers = get_auth_headers('admin@test.com')
    
    # Test file type restriction
    dangerous_files = [
        ('malicious.php', b'<?php echo "hacked"; ?>'),
        ('malicious.js', b'alert("hacked")'),
        ('malicious.exe', b'MZ\x90\x00\x03\x00\x00\x00'),
    ]
    
    for filename, content in dangerous_files:
        response = client.post('/api/tickets/1/files',
                             data={
                                 'file': (content, filename)
                             },
                             headers=headers,
                             content_type='multipart/form-data')
        assert response.status_code == 400, f"Dangerous file type {filename} was accepted"
    
    # Test file size limit
    large_file = b'0' * (10 * 1024 * 1024)  # 10MB file
    response = client.post('/api/tickets/1/files',
                          data={
                              'file': (large_file, 'large.txt')
                          },
                          headers=headers,
                          content_type='multipart/form-data')
    assert response.status_code == 400, "Large file upload not restricted" 