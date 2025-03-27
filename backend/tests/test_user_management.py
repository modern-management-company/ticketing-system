import unittest
import json
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db
from app.models import User, UserProperty, PropertyManager
from config import TestConfig


class UserManagementTestCase(unittest.TestCase):
    """Test case for the user management API endpoints."""

    def setUp(self):
        """Set up the test environment."""
        app.config.from_object(TestConfig)
        self.app = app.test_client()
        with app.app_context():
            db.create_all()
            
            # Create test users
            self.admin = User(
                username='admin_test',
                email='admin@test.com',
                password='password123',
                role='super_admin'
            )
            self.manager = User(
                username='manager_test',
                email='manager@test.com',
                password='password123',
                role='manager'
            )
            self.user = User(
                username='user_test',
                email='user@test.com',
                password='password123',
                role='user',
                group='Engineering'
            )
            
            db.session.add_all([self.admin, self.manager, self.user])
            db.session.commit()
            
            # Get tokens for testing
            self.admin_token = self.admin.get_token()
            self.manager_token = self.manager.get_token()
            self.user_token = self.user.get_token()

    def tearDown(self):
        """Clean up after each test."""
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_user_registration(self):
        """Test user registration endpoint."""
        response = self.app.post('/api/register', json={
            'username': 'new_user',
            'email': 'new_user@test.com',
            'password': 'newpassword123',
            'role': 'user',
            'group': 'Housekeeping'
        }, headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 201)
        
        # Verify user was created
        with app.app_context():
            user = User.query.filter_by(username='new_user').first()
            self.assertIsNotNone(user)
            self.assertEqual(user.email, 'new_user@test.com')
            self.assertEqual(user.role, 'user')
            self.assertEqual(user.group, 'Housekeeping')

    def test_user_login(self):
        """Test user login endpoint."""
        response = self.app.post('/api/login', json={
            'username': 'user_test',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('token', data)

    def test_invalid_login(self):
        """Test login with invalid credentials."""
        response = self.app.post('/api/login', json={
            'username': 'user_test',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 401)

    def test_get_users(self):
        """Test retrieving users list."""
        response = self.app.get('/api/users', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('users', data)
        self.assertEqual(len(data['users']), 3)  # admin, manager, user

    def test_get_user_unauthorized(self):
        """Test retrieving users list as non-admin."""
        response = self.app.get('/api/users', headers={
            'Authorization': f'Bearer {self.user_token}'
        })
        self.assertEqual(response.status_code, 403)

    def test_get_user_by_id(self):
        """Test retrieving a specific user by ID."""
        with app.app_context():
            user_id = self.user.user_id
            
        response = self.app.get(f'/api/users/{user_id}', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['username'], 'user_test')
        self.assertEqual(data['email'], 'user@test.com')
        self.assertEqual(data['role'], 'user')

    def test_update_user(self):
        """Test updating a user."""
        with app.app_context():
            user_id = self.user.user_id
            
        response = self.app.put(f'/api/users/{user_id}', json={
            'email': 'updated_user@test.com',
            'group': 'Front Desk'
        }, headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify user was updated
        with app.app_context():
            updated_user = User.query.get(user_id)
            self.assertEqual(updated_user.email, 'updated_user@test.com')
            self.assertEqual(updated_user.group, 'Front Desk')

    def test_delete_user(self):
        """Test deleting a user."""
        with app.app_context():
            user_id = self.user.user_id
            
        response = self.app.delete(f'/api/users/{user_id}', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify user was deleted
        with app.app_context():
            deleted_user = User.query.get(user_id)
            self.assertIsNone(deleted_user)

if __name__ == '__main__':
    unittest.main() 