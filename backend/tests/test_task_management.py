import unittest
import json
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db
from app.models import User, Property, Task
from config import TestConfig


class TaskManagementTestCase(unittest.TestCase):
    """Test case for the task management API endpoints."""

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
            
            # Get tokens for testing
            self.admin_token = self.admin.get_token()
            self.manager_token = self.manager.get_token()
            self.user_token = self.user.get_token()

    def tearDown(self):
        """Clean up after each test."""
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_create_task(self):
        """Test creating a new task."""
        with app.app_context():
            property_id = self.property.property_id
            
        # Create due date for tomorrow
        due_date = (datetime.utcnow() + timedelta(days=1)).isoformat()
        
        response = self.app.post('/tasks', json={
            'title': 'Test Task',
            'description': 'This is a test task',
            'priority': 'high',
            'due_date': due_date,
            'property_id': property_id,
            'assigned_to_id': self.user.user_id
        }, headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 201)
        
        # Verify task was created
        with app.app_context():
            task = Task.query.filter_by(title='Test Task').first()
            self.assertIsNotNone(task)
            self.assertEqual(task.description, 'This is a test task')
            self.assertEqual(task.priority, 'high')
            self.assertEqual(task.property_id, property_id)
            self.assertEqual(task.assigned_to_id, self.user.user_id)
            self.assertEqual(task.status, 'pending')  # Default status

    def test_get_tasks(self):
        """Test retrieving tasks."""
        with app.app_context():
            # Create a test task
            task = Task(
                title='Existing Task',
                description='This is an existing task',
                priority='medium',
                status='pending',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            db.session.add(task)
            db.session.commit()
            
        response = self.app.get('/tasks', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tasks', data)
        self.assertEqual(len(data['tasks']), 1)
        self.assertEqual(data['tasks'][0]['title'], 'Existing Task')
        self.assertEqual(data['tasks'][0]['priority'], 'medium')

    def test_update_task(self):
        """Test updating a task."""
        with app.app_context():
            # Create a test task
            task = Task(
                title='Update Task',
                description='This task will be updated',
                priority='low',
                status='pending',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            db.session.add(task)
            db.session.commit()
            task_id = task.task_id
            
        response = self.app.put(f'/tasks/{task_id}', json={
            'title': 'Updated Task Title',
            'description': 'Updated description',
            'status': 'in_progress',
            'priority': 'high'
        }, headers={
            'Authorization': f'Bearer {self.manager_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify task was updated
        with app.app_context():
            updated_task = Task.query.get(task_id)
            self.assertEqual(updated_task.title, 'Updated Task Title')
            self.assertEqual(updated_task.description, 'Updated description')
            self.assertEqual(updated_task.status, 'in_progress')
            self.assertEqual(updated_task.priority, 'high')

    def test_delete_task(self):
        """Test deleting a task."""
        with app.app_context():
            # Create a test task
            task = Task(
                title='Delete Task',
                description='This task will be deleted',
                priority='medium',
                status='pending',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            db.session.add(task)
            db.session.commit()
            task_id = task.task_id
            
        response = self.app.delete(f'/tasks/{task_id}', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        
        # Verify task was deleted
        with app.app_context():
            deleted_task = Task.query.get(task_id)
            self.assertIsNone(deleted_task)

    def test_filter_tasks_by_property(self):
        """Test filtering tasks by property."""
        with app.app_context():
            # Create a second property
            property2 = Property(
                name='Second Hotel',
                address='456 Other St, Other City',
                type='hotel'
            )
            db.session.add(property2)
            db.session.commit()
            
            # Create tasks for both properties
            task1 = Task(
                title='Task 1',
                description='Task for property 1',
                priority='high',
                status='pending',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            
            task2 = Task(
                title='Task 2',
                description='Task for property 2',
                priority='medium',
                status='pending',
                property_id=property2.property_id,
                assigned_to_id=self.user.user_id
            )
            
            db.session.add_all([task1, task2])
            db.session.commit()
            
            property_id = self.property.property_id
            
        response = self.app.get(f'/tasks?property_id={property_id}', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tasks', data)
        self.assertEqual(len(data['tasks']), 1)
        self.assertEqual(data['tasks'][0]['title'], 'Task 1')

    def test_filter_tasks_by_status(self):
        """Test filtering tasks by status."""
        with app.app_context():
            # Create tasks with different statuses
            task1 = Task(
                title='Pending Task',
                description='Task with pending status',
                priority='high',
                status='pending',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            
            task2 = Task(
                title='Completed Task',
                description='Task with completed status',
                priority='medium',
                status='completed',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            
            db.session.add_all([task1, task2])
            db.session.commit()
            
        response = self.app.get('/tasks?status=completed', headers={
            'Authorization': f'Bearer {self.admin_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tasks', data)
        self.assertEqual(len(data['tasks']), 1)
        self.assertEqual(data['tasks'][0]['title'], 'Completed Task')

    def test_get_user_tasks(self):
        """Test retrieving tasks assigned to a user."""
        with app.app_context():
            # Create tasks assigned to different users
            task1 = Task(
                title='User Task',
                description='Task assigned to user',
                priority='high',
                status='pending',
                property_id=self.property.property_id,
                assigned_to_id=self.user.user_id
            )
            
            task2 = Task(
                title='Manager Task',
                description='Task assigned to manager',
                priority='medium',
                status='pending',
                property_id=self.property.property_id,
                assigned_to_id=self.manager.user_id
            )
            
            db.session.add_all([task1, task2])
            db.session.commit()
            
            user_id = self.user.user_id
            
        response = self.app.get(f'/users/{user_id}/tasks', headers={
            'Authorization': f'Bearer {self.user_token}'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('tasks', data)
        self.assertEqual(len(data['tasks']), 1)
        self.assertEqual(data['tasks'][0]['title'], 'User Task')

if __name__ == '__main__':
    unittest.main() 