import unittest
import json
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db
from app.models import User, Property, Room, ServiceRequest
from config import TestConfig


class ServiceRequestTestCase(unittest.TestCase):
    """Test case for the service request API endpoints."""

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
                group='Housekeeping'
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
            
            # Get tokens for testing
            self.admin_token = self.admin.get_token()
            self.manager_token = self.manager.get_token()
            self.user_token = self.user.get_token()

    def tearDown(self):
        """Clean up after each test."""
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_create_service_request(self):
        """Test creating a new service request."""
        with app.app_context():
            property_id = self.property.property_id
            room_id = self.room.room_id
            
        response = self.app.post('/service-requests', json={
            'room_id': room_id,
            'property_id': property_id,
            'request_group': 'Housekeeping',
            'request_type': 'Room Cleaning',
            'priority': 'normal',
            'quantity': 1,
            'guest_name': 'John Doe',
            'notes': 'Please clean the room ASAP'
        }, headers={
            'Authorization': f'Bearer {self.user_token}'
        })
        self.assertEqual(response.status_code, 201)
        
        # Verify service request was created
        with app.app_context():
            request = ServiceRequest.query.filter_by(guest_name='John Doe').first()
            self.assertIsNotNone(request)
            self.assertEqual(request.request_group, 'Housekeeping')
            self.assertEqual(request.request_type, 'Room Cleaning')
            self.assertEqual(request.priority, 'normal')
            self.assertEqual(request.quantity, 1)
            self.assertEqual(request.notes, 'Please clean the room ASAP')
            self.assertEqual(request.property_id, property_id)
            self.assertEqual(request.room_id, room_id)
            self.assertEqual(request.status, 'pending')  # Default status

    def test_get_service_requests(self):
        """Test retrieving service requests."""
        with app.app_context():
            # Create a test service request
            service_request = ServiceRequest(
                room_id=self.room.room_id,
                property_id=self.property.property_id,
                request_group='Housekeeping',
                request_type='Extra Towels',
                priority='high',
                quantity=2,
                guest_name='Jane Smith',
                notes='Guest requested extra towels',
                created_by_id=self.user.user_id
            )
            db.session.add(service_request)
            db.session.commit()
            
        response = self.app.get('/service-requests', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('requests', data)
        self.assertEqual(len(data['requests']), 1)
        self.assertEqual(data['requests'][0]['request_type'], 'Extra Towels')
        self.assertEqual(data['requests'][0]['guest_name'], 'Jane Smith')

    def test_update_service_request(self):
        """Test updating a service request."""
        with app.app_context():
            # Create a test service request
            service_request = ServiceRequest(
                room_id=self.room.room_id,
                property_id=self.property.property_id,
                request_group='Engineering',
                request_type='TV Repair',
                priority='normal',
                guest_name='Bob Johnson',
                notes='TV not working',
                created_by_id=self.user.user_id
            )
            db.session.add(service_request)
            db.session.commit()
            request_id = service_request.request_id
            
        response = self.app.put(f'/service-requests/{request_id}', json={
            'status': 'in_progress',
            'priority': 'high',
            'notes': 'TV not working, needs replacement'
        }, headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify service request was updated
        with app.app_context():
            updated_request = ServiceRequest.query.get(request_id)
            self.assertEqual(updated_request.status, 'in_progress')
            self.assertEqual(updated_request.priority, 'high')
            self.assertEqual(updated_request.notes, 'TV not working, needs replacement')

    def test_delete_service_request(self):
        """Test deleting a service request."""
        with app.app_context():
            # Create a test service request
            service_request = ServiceRequest(
                room_id=self.room.room_id,
                property_id=self.property.property_id,
                request_group='Front Desk',
                request_type='Late Checkout',
                priority='normal',
                guest_name='Alice Brown',
                created_by_id=self.user.user_id
            )
            db.session.add(service_request)
            db.session.commit()
            request_id = service_request.request_id
            
        response = self.app.delete(f'/service-requests/{request_id}', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify service request was deleted
        with app.app_context():
            deleted_request = ServiceRequest.query.get(request_id)
            self.assertIsNone(deleted_request)

    def test_filter_service_requests_by_group(self):
        """Test filtering service requests by group."""
        with app.app_context():
            # Create service requests with different groups
            request1 = ServiceRequest(
                room_id=self.room.room_id,
                property_id=self.property.property_id,
                request_group='Housekeeping',
                request_type='Room Cleaning',
                priority='normal',
                created_by_id=self.user.user_id
            )
            
            request2 = ServiceRequest(
                room_id=self.room.room_id,
                property_id=self.property.property_id,
                request_group='Engineering',
                request_type='AC Repair',
                priority='high',
                created_by_id=self.user.user_id
            )
            
            db.session.add_all([request1, request2])
            db.session.commit()
            
        response = self.app.get('/service-requests?request_group=Engineering', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('requests', data)
        self.assertEqual(len(data['requests']), 1)
        self.assertEqual(data['requests'][0]['request_type'], 'AC Repair')

    def test_complete_service_request(self):
        """Test marking a service request as completed."""
        with app.app_context():
            # Create a test service request
            service_request = ServiceRequest(
                room_id=self.room.room_id,
                property_id=self.property.property_id,
                request_group='Housekeeping',
                request_type='Turndown Service',
                priority='normal',
                guest_name='David Wilson',
                created_by_id=self.user.user_id
            )
            db.session.add(service_request)
            db.session.commit()
            request_id = service_request.request_id
            
        response = self.app.put(f'/service-requests/{request_id}/complete', headers={
            'Authorization': f'Bearer {self.user_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify service request was marked as completed
        with app.app_context():
            updated_request = ServiceRequest.query.get(request_id)
            self.assertEqual(updated_request.status, 'completed')
            self.assertIsNotNone(updated_request.completed_at)

if __name__ == '__main__':
    unittest.main() 