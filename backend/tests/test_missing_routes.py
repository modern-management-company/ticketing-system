import unittest
import json
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db
from app.models import User, Property, Room, Ticket, Task, ServiceRequest, EmailSettings
from app.services.email_service import EmailService
from app.services.email_test_service import EmailTestService
from config import TestConfig


class MissingRoutesTestCase(unittest.TestCase):
    """Test case for routes that are missing coverage in other test files."""

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
            
            # Create a test property
            self.property = Property(
                name='Test Hotel',
                address='123 Test St, Test City',
                type='hotel'
            )
            db.session.add(self.property)
            db.session.commit()
            
            # Create a test room
            self.room = Room(
                name='Room 101',
                property_id=self.property.property_id,
                type='standard',
                floor=1
            )
            db.session.add(self.room)
            db.session.commit()
            
            # Create test email settings
            self.email_settings = EmailSettings(
                smtp_server='smtp.test.com',
                smtp_port=587,
                smtp_username='test@test.com',
                smtp_password='test_password',
                sender_email='sender@test.com',
                enable_email_notifications=True
            )
            db.session.add(self.email_settings)
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
    
    def should_skip_external_services(self):
        """Check if tests requiring external services should be skipped."""
        return os.environ.get('SKIP_EXTERNAL_SERVICES', 'False').lower() == 'true'
    
    def test_check_first_user(self):
        """Test checking if first user exists."""
        response = self.app.get('/check-first-user')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('exists', data)
        self.assertTrue(data['exists'])  # Users were created in setUp
    
    def test_verify_token(self):
        """Test verifying a token."""
        response = self.app.get('/verify-token', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('valid', data)
        self.assertTrue(data['valid'])
    
    def test_health_check(self):
        """Test the health check endpoint."""
        response = self.app.get('/ping')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['message'], 'pong')
    
    def test_switch_property(self):
        """Test switching the active property for a user."""
        with app.app_context():
            # Add a second property
            property2 = Property(
                name='Second Hotel',
                address='456 Other St, Other City',
                type='hotel'
            )
            db.session.add(property2)
            db.session.commit()
            
            # Assign user to second property
            from app.models import UserProperty
            user_property = UserProperty(
                user_id=self.user.user_id,
                property_id=property2.property_id
            )
            db.session.add(user_property)
            db.session.commit()
            
            property_id = property2.property_id
            
        response = self.app.post('/switch_property', json={
            'property_id': property_id
        }, headers={
            'Authorization': f'Bearer {self.user_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertIn('success', data)
        self.assertTrue(data['success'])
    
    def test_dashboard_stats(self):
        """Test retrieving dashboard statistics."""
        response = self.app.get('/dashboard/stats', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('openTickets', data)
        self.assertIn('totalProperties', data)
        self.assertIn('totalTasks', data)
        self.assertIn('recentTickets', data)
        self.assertIn('recentTasks', data)
    
    def test_system_settings(self):
        """Test retrieving and updating system settings."""
        # Test get settings
        response = self.app.get('/api/settings/system', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Test update settings
        response = self.app.post('/api/settings/system', json={
            'maintenance_mode': False,
            'system_notice': 'Test notice'
        }, headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertTrue(data['success'])
    
    def test_property_managers(self):
        """Test retrieving property managers."""
        with app.app_context():
            # Assign manager to property
            from app.models import PropertyManager
            manager_assignment = PropertyManager(
                user_id=self.manager.user_id,
                property_id=self.property.property_id
            )
            db.session.add(manager_assignment)
            db.session.commit()
            
            property_id = self.property.property_id
            
        response = self.app.get(f'/properties/{property_id}/managers', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('managers', data)
        self.assertEqual(len(data['managers']), 1)
        self.assertEqual(data['managers'][0]['username'], 'manager_test')
    
    def test_upload_rooms(self):
        """Test uploading rooms via CSV."""
        with app.app_context():
            property_id = self.property.property_id
            
        csv_content = b'name,type,floor,status\nRoom 201,deluxe,2,available\nRoom 202,standard,2,available'
        response = self.app.post(
            f'/properties/{property_id}/rooms/upload',
            data={
                'file': (BytesIO(csv_content), 'rooms.csv')
            },
            headers={
                'Authorization': f'Bearer {self.admin_token}'
            },
            content_type='multipart/form-data'
        )
        self.assertEqual(response.status_code, 201)
        
        # Verify rooms were created
        with app.app_context():
            rooms = Room.query.filter_by(property_id=property_id).all()
            self.assertEqual(len(rooms), 3)  # 1 existing + 2 new
    
    def test_password_reset(self):
        """Test the password reset endpoints."""
        if self.should_skip_external_services():
            self.skipTest("Skipping test that requires external email services")
            
        # Test requesting a password reset
        response = self.app.post('/auth/request-reset', json={
            'email': 'user@test.com'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertTrue(data['success'])
        
        # Get reset token (would normally be sent via email)
        with app.app_context():
            user = User.query.filter_by(email='user@test.com').first()
            reset_token = user.get_reset_token()
            
        # Test resetting the password with the token
        response = self.app.post('/auth/reset-password', json={
            'token': reset_token,
            'new_password': 'new_secure_password123'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertTrue(data['success'])
        
        # Test logging in with the new password
        response = self.app.post('/api/login', json={
            'email': 'user@test.com',
            'password': 'new_secure_password123'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('token', data)
        self.assertIn('user', data)
    
    def test_user_profile(self):
        """Test retrieving user profile."""
        with app.app_context():
            user_id = self.user.user_id
            
        response = self.app.get(f'/users/{user_id}/profile', headers={
            'Authorization': f'Bearer {self.user_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['username'], 'user_test')
        self.assertEqual(data['email'], 'user@test.com')
        self.assertEqual(data['role'], 'user')
    
    def test_change_password(self):
        """Test changing password."""
        with app.app_context():
            user_id = self.user.user_id
            
        response = self.app.post(f'/users/{user_id}/change-password', json={
            'old_password': 'password123',
            'new_password': 'new_password123'
        }, headers={
            'Authorization': f'Bearer {self.user_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertTrue(data['success'])
    
    def test_admin_change_password(self):
        """Test admin changing user password."""
        with app.app_context():
            user_id = self.user.user_id
            
        response = self.app.post(f'/users/{user_id}/admin-change-password', json={
            'new_password': 'admin_set_password123'
        }, headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertTrue(data['success'])
    
    def test_statistics(self):
        """Test retrieving statistics."""
        response = self.app.get('/statistics', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('ticket_stats', data)
        self.assertIn('task_stats', data)
    
    def test_property_statistics(self):
        """Test retrieving property-specific statistics."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.get(f'/properties/{property_id}/statistics', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('ticket_stats', data)
        self.assertIn('task_stats', data)
    
    def test_task_details(self):
        """Test retrieving task details."""
        with app.app_context():
            # Create a test task
            task = Task(
                title='Test Task',
                description='Task description',
                status='pending',
                priority='high',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            db.session.add(task)
            db.session.commit()
            task_id = task.task_id
            
        response = self.app.get(f'/tasks/{task_id}/details', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['title'], 'Test Task')
        self.assertEqual(data['status'], 'pending')
        self.assertEqual(data['priority'], 'high')
    
    @patch('app.services.email_service.EmailService', new_callable=MagicMock)
    def test_send_report_email(self, mock_email_service):
        """Test sending report via email."""
        if self.should_skip_external_services():
            self.skipTest("Skipping test that requires external email services")
            
        # Setup mock return value
        mock_email_service.return_value.send_email.return_value = True
        
        # Test sending report via email
        response = self.app.post('/api/reports/send-email', json={
            'email': 'manager@test.com',
            'report_type': 'tickets',
            'start_date': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
            'end_date': datetime.now().strftime('%Y-%m-%d'),
            'format': 'pdf'
        }, headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertTrue(data['success'])
        
        # Check that the generate_report function was called
        mock_email_service.return_value.send_email.assert_called_once()
    
    def test_verify_user_properties(self):
        """Test verifying user property assignments."""
        with app.app_context():
            user_id = self.user.user_id
            
        response = self.app.get(f'/users/{user_id}/verify-properties', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('user_properties', data)
        
    def test_fix_manager_properties(self):
        """Test fixing manager property assignments."""
        response = self.app.post('/fix-manager-properties', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('fixed_count', data)
        
    @patch('app.services.email_test_service.EmailTestService', new_callable=MagicMock)
    def test_test_email(self, mock_email_test_service):
        """Test the email test endpoint."""
        if self.should_skip_external_services():
            self.skipTest("Skipping test that requires external email services")
            
        # Setup mock return value
        mock_email_test_service.return_value.send_test_email.return_value = True
        
        # Test sending a test email
        response = self.app.post('/api/test-email', json={
            'email': 'test@example.com'
        }, headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertTrue(data['success'])
        
        # Check that the send_test_email function was called with the right email
        mock_email_test_service.return_value.send_test_email.assert_called_with('test@example.com')
    
    @patch('app.services.email_test_service.EmailTestService', new_callable=MagicMock)
    def test_test_all_emails(self, mock_email_test_service):
        """Test the all email tests endpoint."""
        if self.should_skip_external_services():
            self.skipTest("Skipping test that requires external email services")
            
        # Setup mock return value
        mock_email_test_service.return_value.test_all_emails.return_value = {
            'success': True,
            'results': {
                'welcome_email': True,
                'password_reset': True,
                'ticket_notification': True,
                'task_notification': True
            }
        }
        
        # Test running all email tests
        response = self.app.post('/api/test-all-emails', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('success', data)
        self.assertTrue(data['success'])
        self.assertIn('results', data)
        
        # Check that the test_all_emails function was called
        mock_email_test_service.return_value.test_all_emails.assert_called_once()

    def test_service_request_update(self):
        """Test updating a service request."""
        with app.app_context():
            # Create a test service request
            service_request = ServiceRequest(
                room_id=self.room.room_id,
                property_id=self.property.property_id,
                request_group='Housekeeping',
                request_type='Room Cleaning',
                priority='normal',
                created_by_id=self.user.user_id
            )
            db.session.add(service_request)
            db.session.commit()
            request_id = service_request.request_id
            
        response = self.app.patch(f'/service-requests/{request_id}', json={
            'status': 'in_progress',
            'notes': 'Test update notes'
        }, headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        
        # Verify service request was updated
        with app.app_context():
            updated_request = ServiceRequest.query.get(request_id)
            self.assertEqual(updated_request.status, 'in_progress')
            self.assertEqual(updated_request.notes, 'Test update notes')


# Need to add this import for file upload test
from io import BytesIO


if __name__ == '__main__':
    unittest.main() 