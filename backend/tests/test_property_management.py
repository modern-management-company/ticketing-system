import unittest
import json
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db
from app.models import User, Property, Room, PropertyManager, UserProperty
from config import TestConfig


class PropertyManagementTestCase(unittest.TestCase):
    """Test case for the property management API endpoints."""

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
                role='user'
            )
            
            db.session.add_all([self.admin, self.manager, self.user])
            db.session.commit()
            
            # Create a test property
            self.property = Property(
                name='Test Hotel',
                address='123 Test St, Test City',
                type='hotel',
                status='active',
                description='A test property'
            )
            db.session.add(self.property)
            db.session.commit()
            
            # Assign property to manager
            manager_assignment = PropertyManager(
                user_id=self.manager.user_id,
                property_id=self.property.property_id
            )
            db.session.add(manager_assignment)
            
            # Assign property to user
            user_assignment = UserProperty(
                user_id=self.user.user_id,
                property_id=self.property.property_id
            )
            db.session.add(user_assignment)
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

    def test_get_properties(self):
        """Test retrieving properties."""
        response = self.app.get('/properties', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('properties', data)
        self.assertEqual(len(data['properties']), 1)
        self.assertEqual(data['properties'][0]['name'], 'Test Hotel')

    def test_create_property(self):
        """Test creating a new property."""
        response = self.app.post('/properties', json={
            'name': 'New Property',
            'address': '456 New St, New City',
            'type': 'apartment',
            'status': 'active'
        }, headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 201)
        
        # Verify property was created
        with app.app_context():
            property = Property.query.filter_by(name='New Property').first()
            self.assertIsNotNone(property)
            self.assertEqual(property.address, '456 New St, New City')
            self.assertEqual(property.type, 'apartment')

    def test_update_property(self):
        """Test updating a property."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.put(f'/properties/{property_id}', json={
            'name': 'Updated Hotel',
            'address': '789 Updated St, Updated City',
            'type': 'motel'
        }, headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify property was updated
        with app.app_context():
            updated_property = Property.query.get(property_id)
            self.assertEqual(updated_property.name, 'Updated Hotel')
            self.assertEqual(updated_property.address, '789 Updated St, Updated City')
            self.assertEqual(updated_property.type, 'motel')

    def test_delete_property(self):
        """Test deleting a property."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.delete(f'/properties/{property_id}', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify property was deleted
        with app.app_context():
            deleted_property = Property.query.get(property_id)
            self.assertIsNone(deleted_property)

    def test_add_room(self):
        """Test adding a room to a property."""
        with app.app_context():
            property_id = self.property.property_id
            
        response = self.app.post(f'/properties/{property_id}/rooms', json={
            'name': 'Room 101',
            'type': 'standard',
            'floor': 1,
            'status': 'available',
            'capacity': 2,
            'amenities': ['TV', 'WiFi', 'Minibar']
        }, headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 201)
        
        # Verify room was created
        with app.app_context():
            room = Room.query.filter_by(name='Room 101').first()
            self.assertIsNotNone(room)
            self.assertEqual(room.property_id, property_id)
            self.assertEqual(room.floor, 1)
            self.assertEqual(room.capacity, 2)
            self.assertEqual(room.amenities, ['TV', 'WiFi', 'Minibar'])

    def test_get_rooms(self):
        """Test retrieving rooms for a property."""
        with app.app_context():
            property_id = self.property.property_id
            
            # Add a test room
            room = Room(
                name='Test Room',
                property_id=property_id,
                type='deluxe',
                floor=2,
                status='available',
                capacity=3
            )
            db.session.add(room)
            db.session.commit()
            
        response = self.app.get(f'/properties/{property_id}/rooms', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('rooms', data)
        self.assertEqual(len(data['rooms']), 1)
        self.assertEqual(data['rooms'][0]['name'], 'Test Room')
        self.assertEqual(data['rooms'][0]['type'], 'deluxe')

    def test_manager_properties(self):
        """Test getting properties managed by a user."""
        with app.app_context():
            user_id = self.manager.user_id
            
        response = self.app.get(f'/users/{user_id}/managed-properties', headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('properties', data)
        self.assertEqual(len(data['properties']), 1)
        self.assertEqual(data['properties'][0]['name'], 'Test Hotel')

    def test_user_properties(self):
        """Test getting properties assigned to a user."""
        with app.app_context():
            user_id = self.user.user_id
            
        response = self.app.get(f'/users/{user_id}/properties', headers={
            'Authorization': f'Bearer {self.user_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('properties', data)
        self.assertEqual(len(data['properties']), 1)
        self.assertEqual(data['properties'][0]['name'], 'Test Hotel')

if __name__ == '__main__':
    unittest.main() 