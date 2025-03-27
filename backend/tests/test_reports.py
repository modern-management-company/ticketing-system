import unittest
import json
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db
from app.models import User, Property, Ticket, Task, ServiceRequest
from config import TestConfig


class ReportTestCase(unittest.TestCase):
    """Test case for the report generation API endpoints."""

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
            
            # Create test data for reporting
            # Ticket data
            ticket1 = Ticket(
                title='Test Ticket 1',
                description='Test description 1',
                status='open',
                priority='high',
                category='maintenance',
                user_id=self.user.user_id,
                property_id=self.property.property_id
            )
            
            ticket2 = Ticket(
                title='Test Ticket 2',
                description='Test description 2',
                status='closed',
                priority='medium',
                category='housekeeping',
                user_id=self.user.user_id,
                property_id=self.property.property_id
            )
            
            # Task data
            task1 = Task(
                title='Test Task 1',
                description='Test task description 1',
                status='pending',
                priority='high',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            
            task2 = Task(
                title='Test Task 2',
                description='Test task description 2',
                status='completed',
                priority='low',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            
            # Service request data
            request1 = ServiceRequest(
                room_id=1,  # Dummy ID
                property_id=self.property.property_id,
                request_group='Housekeeping',
                request_type='Room Cleaning',
                priority='normal',
                status='pending',
                created_by_id=self.user.user_id
            )
            
            request2 = ServiceRequest(
                room_id=1,  # Dummy ID
                property_id=self.property.property_id,
                request_group='Engineering',
                request_type='AC Repair',
                priority='high',
                status='completed',
                created_by_id=self.user.user_id
            )
            
            db.session.add_all([ticket1, ticket2, task1, task2, request1, request2])
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

    def test_ticket_report(self):
        """Test generating a ticket report."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.get(f'/api/reports/tickets?property_id={property_id}', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tickets', data)
        self.assertEqual(len(data['tickets']), 2)
        
        # Test filtering by status
        response = self.app.get(f'/api/reports/tickets?property_id={property_id}&status=open', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tickets', data)
        self.assertEqual(len(data['tickets']), 1)
        self.assertEqual(data['tickets'][0]['title'], 'Test Ticket 1')

    def test_task_report(self):
        """Test generating a task report."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.get(f'/api/reports/tasks?property_id={property_id}', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tasks', data)
        self.assertEqual(len(data['tasks']), 2)
        
        # Test filtering by status
        response = self.app.get(f'/api/reports/tasks?property_id={property_id}&status=completed', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tasks', data)
        self.assertEqual(len(data['tasks']), 1)
        self.assertEqual(data['tasks'][0]['title'], 'Test Task 2')

    def test_service_request_report(self):
        """Test generating a service request report."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.get(f'/api/reports/requests?property_id={property_id}', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('requests', data)
        self.assertEqual(len(data['requests']), 2)
        
        # Test filtering by group
        response = self.app.get(f'/api/reports/requests?property_id={property_id}&request_group=Engineering', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('requests', data)
        self.assertEqual(len(data['requests']), 1)
        self.assertEqual(data['requests'][0]['request_type'], 'AC Repair')

    def test_summary_report(self):
        """Test generating a summary report."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.get(f'/api/reports/summary?property_id={property_id}', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verify summary counts
        self.assertIn('ticket_counts', data)
        self.assertIn('task_counts', data)
        self.assertIn('request_counts', data)
        
        self.assertEqual(data['ticket_counts']['total'], 2)
        self.assertEqual(data['ticket_counts']['open'], 1)
        self.assertEqual(data['ticket_counts']['closed'], 1)
        
        self.assertEqual(data['task_counts']['total'], 2)
        self.assertEqual(data['task_counts']['pending'], 1)
        self.assertEqual(data['task_counts']['completed'], 1)
        
        self.assertEqual(data['request_counts']['total'], 2)
        self.assertEqual(data['request_counts']['pending'], 1)
        self.assertEqual(data['request_counts']['completed'], 1)

    def test_date_range_report(self):
        """Test generating a report with date range filters."""
        with app.app_context():
            property_id = self.property.property_id
            
        # Use today's date for the range
        today = datetime.utcnow().strftime('%Y-%m-%d')
        
        response = self.app.get(
            f'/api/reports/tickets?property_id={property_id}&start_date={today}&end_date={today}',
            headers={'Authorization': f'Bearer {self.manager_token}'}
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tickets', data)
        # All test tickets should be created today
        self.assertEqual(len(data['tickets']), 2)

    def test_export_report(self):
        """Test exporting a report."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.post('/api/reports/export', json={
            'property_id': property_id,
            'report_type': 'tickets',
            'format': 'csv'
        }, headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('report_url', json.loads(response.data))

    def test_unauthorized_report_access(self):
        """Test unauthorized access to reports."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.get(f'/api/reports/tickets?property_id={property_id}', headers={
            'Authorization': f'Bearer {self.user_token}'  # Regular user, not manager/admin
        })
        self.assertEqual(response.status_code, 403)

if __name__ == '__main__':
    unittest.main() 