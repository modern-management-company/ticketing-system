import unittest
import json
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db
from app.models import User, Property, Room, Ticket, Task
from config import TestConfig


class TicketManagementTestCase(unittest.TestCase):
    """Test case for the ticket management API endpoints."""

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
            
            # Get tokens for testing
            self.admin_token = self.admin.get_token()
            self.manager_token = self.manager.get_token()
            self.user_token = self.user.get_token()

    def tearDown(self):
        """Clean up after each test."""
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_create_ticket(self):
        """Test creating a new ticket."""
        with app.app_context():
            property_id = self.property.property_id
            room_id = self.room.room_id
            
        response = self.app.post('/tickets', json={
            'title': 'Test Ticket',
            'description': 'This is a test ticket',
            'priority': 'high',
            'category': 'maintenance',
            'subcategory': 'plumbing',
            'property_id': property_id,
            'room_id': room_id
        }, headers={
            'Authorization': f'Bearer {self.user_token}'
        })
        self.assertEqual(response.status_code, 201)
        
        # Verify ticket was created
        with app.app_context():
            ticket = Ticket.query.filter_by(title='Test Ticket').first()
            self.assertIsNotNone(ticket)
            self.assertEqual(ticket.description, 'This is a test ticket')
            self.assertEqual(ticket.priority, 'high')
            self.assertEqual(ticket.category, 'maintenance')
            self.assertEqual(ticket.subcategory, 'plumbing')
            self.assertEqual(ticket.property_id, property_id)
            self.assertEqual(ticket.room_id, room_id)
            self.assertEqual(ticket.user_id, self.user.user_id)
            self.assertEqual(ticket.status, 'open')  # Default status

    def test_get_tickets(self):
        """Test retrieving tickets."""
        with app.app_context():
            # Create a test ticket
            ticket = Ticket(
                title='Existing Ticket',
                description='This is an existing ticket',
                priority='medium',
                category='housekeeping',
                user_id=self.user.user_id,
                property_id=self.property.property_id,
                room_id=self.room.room_id
            )
            db.session.add(ticket)
            db.session.commit()
            
        response = self.app.get('/tickets', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tickets', data)
        self.assertEqual(len(data['tickets']), 1)
        self.assertEqual(data['tickets'][0]['title'], 'Existing Ticket')
        self.assertEqual(data['tickets'][0]['priority'], 'medium')

    def test_update_ticket(self):
        """Test updating a ticket."""
        with app.app_context():
            # Create a test ticket
            ticket = Ticket(
                title='Update Ticket',
                description='This ticket will be updated',
                priority='low',
                category='it',
                user_id=self.user.user_id,
                property_id=self.property.property_id
            )
            db.session.add(ticket)
            db.session.commit()
            ticket_id = ticket.ticket_id
            
        response = self.app.put(f'/tickets/{ticket_id}', json={
            'title': 'Updated Ticket Title',
            'description': 'Updated description',
            'status': 'in_progress',
            'priority': 'high'
        }, headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify ticket was updated
        with app.app_context():
            updated_ticket = Ticket.query.get(ticket_id)
            self.assertEqual(updated_ticket.title, 'Updated Ticket Title')
            self.assertEqual(updated_ticket.description, 'Updated description')
            self.assertEqual(updated_ticket.status, 'in_progress')
            self.assertEqual(updated_ticket.priority, 'high')

    def test_delete_ticket(self):
        """Test deleting a ticket."""
        with app.app_context():
            # Create a test ticket
            ticket = Ticket(
                title='Delete Ticket',
                description='This ticket will be deleted',
                priority='medium',
                category='facilities',
                user_id=self.user.user_id,
                property_id=self.property.property_id
            )
            db.session.add(ticket)
            db.session.commit()
            ticket_id = ticket.ticket_id
            
        response = self.app.delete(f'/tickets/{ticket_id}', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify ticket was deleted
        with app.app_context():
            deleted_ticket = Ticket.query.get(ticket_id)
            self.assertIsNone(deleted_ticket)

    def test_assign_ticket_to_task(self):
        """Test assigning a ticket to a task."""
        with app.app_context():
            # Create a test ticket
            ticket = Ticket(
                title='Assign Ticket',
                description='This ticket will be assigned to a task',
                priority='high',
                category='maintenance',
                user_id=self.user.user_id,
                property_id=self.property.property_id,
                room_id=self.room.room_id
            )
            db.session.add(ticket)
            db.session.commit()
            ticket_id = ticket.ticket_id
            
        response = self.app.post(f'/tickets/{ticket_id}/assign', json={
            'assigned_to_id': self.user.user_id,
            'due_date': (datetime.utcnow().isoformat()),
            'task_title': 'Fix the issue'
        }, headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 201)
        
        # Verify task was created and linked to ticket
        with app.app_context():
            tasks = Task.query.filter_by(assigned_to_id=self.user.user_id).all()
            self.assertEqual(len(tasks), 1)
            self.assertEqual(tasks[0].title, 'Fix the issue')
            self.assertEqual(tasks[0].property_id, self.property.property_id)
            
            # Check if ticket status was updated
            updated_ticket = Ticket.query.get(ticket_id)
            self.assertEqual(updated_ticket.status, 'assigned')  # Assuming status changes to 'assigned'

    def test_filter_tickets_by_property(self):
        """Test filtering tickets by property."""
        with app.app_context():
            # Create a second property
            property2 = Property(
                name='Second Hotel',
                address='456 Other St, Other City',
                type='hotel'
            )
            db.session.add(property2)
            db.session.commit()
            
            # Create tickets for both properties
            ticket1 = Ticket(
                title='Ticket 1',
                description='Ticket for property 1',
                priority='high',
                category='maintenance',
                user_id=self.user.user_id,
                property_id=self.property.property_id
            )
            
            ticket2 = Ticket(
                title='Ticket 2',
                description='Ticket for property 2',
                priority='medium',
                category='housekeeping',
                user_id=self.user.user_id,
                property_id=property2.property_id
            )
            
            db.session.add_all([ticket1, ticket2])
            db.session.commit()
            
            property_id = self.property.property_id
            
        response = self.app.get(f'/tickets?property_id={property_id}', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tickets', data)
        self.assertEqual(len(data['tickets']), 1)
        self.assertEqual(data['tickets'][0]['title'], 'Ticket 1')

if __name__ == '__main__':
    unittest.main() 