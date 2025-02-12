from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(20), default='user')  # user, manager, super_admin
    manager_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)

    # Define relationships
    team_members = db.relationship('User', 
                                 backref=db.backref('manager', remote_side=[user_id]),
                                 foreign_keys=[manager_id])
    
    managed_properties = db.relationship('Property',
                                       backref='manager',
                                       lazy='dynamic')
    
    assigned_tasks = db.relationship('Task',
                                   backref='assigned_to',
                                   lazy='dynamic',
                                   foreign_keys='Task.assigned_to_id')

    def __init__(self, username, email, password, role='user', manager_id=None):
        self.username = username
        self.email = email
        self.set_password(password)
        self.role = role
        self.manager_id = manager_id

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def get_token(self, expires_delta=None):
        """Generate JWT token for the user"""
        identity = {
            'user_id': self.user_id,
            'username': self.username,
            'role': self.role,
            'email': self.email
        }
        
        # Convert datetime objects to ISO format strings
        additional_claims = {
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'csrf': None  # Disable CSRF for now
        }
        
        return create_access_token(
            identity=identity,
            expires_delta=expires_delta,
            additional_claims=additional_claims
        )

    def to_dict(self):
        """Convert user object to dictionary"""
        return {
            'id': self.user_id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'manager_id': self.manager_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active
        }

    def __repr__(self):
        return f'<User {self.username}>'

class Property(db.Model):
    __tablename__ = 'properties'
    property_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200))
    type = db.Column(db.String(50))
    status = db.Column(db.String(20), default='active')
    manager_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    rooms = db.relationship('Room', backref='property', lazy=True)
    tickets = db.relationship('Ticket', backref='property', lazy=True)
    tasks = db.relationship('Task', backref='property', lazy=True)

    def to_dict(self):
        """Convert property object to dictionary"""
        return {
            'id': self.property_id,
            'name': self.name,
            'address': self.address,
            'type': self.type,
            'status': self.status,
            'manager_id': self.manager_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Room(db.Model):
    __tablename__ = 'rooms'
    room_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'), nullable=False)

class Ticket(db.Model):
    __tablename__ = 'tickets'
    ticket_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='open')
    priority = db.Column(db.String(20), nullable=False)
    category = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'))
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.room_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

class TaskAssignment(db.Model):
    __tablename__ = 'task_assignments'
    task_id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.ticket_id'), nullable=False)
    assigned_to_user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    status = db.Column(db.String(50), default='Pending')

    ticket = db.relationship('Ticket', backref=db.backref('task_assignments', lazy=True))
    user = db.relationship('User', backref=db.backref('task_assignments', lazy=True))

class Activity(db.Model):
    __tablename__ = 'activities'
    activity_id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'), nullable=True)

    user = db.relationship('User', backref='activities')
    property = db.relationship('Property', backref='activities')

class UserProperty(db.Model):
    __tablename__ = 'user_properties'
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'), primary_key=True)

class Task(db.Model):
    __tablename__ = 'tasks'
    task_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    priority = db.Column(db.String(20))
    due_date = db.Column(db.DateTime)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'))
    assigned_to_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert task object to dictionary"""
        return {
            'id': self.task_id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'property_id': self.property_id,
            'assigned_to_id': self.assigned_to_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PropertyTheme(db.Model):
    __tablename__ = 'property_themes'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'), nullable=False)
    primary_color = db.Column(db.String(7), nullable=False, default='#1976d2')
    secondary_color = db.Column(db.String(7), nullable=False, default='#dc004e')
    background_color = db.Column(db.String(7), nullable=False, default='#ffffff')
    accent_color = db.Column(db.String(7), nullable=False, default='#f50057')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    property = db.relationship('Property', backref=db.backref('theme', uselist=False))

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'colors': {
                'primary': self.primary_color,
                'secondary': self.secondary_color,
                'background': self.background_color,
                'accent': self.accent_color
            },
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class SystemSettings(db.Model):
    __tablename__ = 'system_settings'

    id = db.Column(db.Integer, primary_key=True)
    site_name = db.Column(db.String(100), nullable=False, default='Property Management System')
    maintenance_mode = db.Column(db.Boolean, nullable=False, default=False)
    user_registration = db.Column(db.Boolean, nullable=False, default=True)
    max_file_size = db.Column(db.Integer, nullable=False, default=16)  # in MB
    session_timeout = db.Column(db.Integer, nullable=False, default=60)  # in minutes
    default_language = db.Column(db.String(2), nullable=False, default='en')
    email_notifications = db.Column(db.Boolean, nullable=False, default=True)
    backup_frequency = db.Column(db.Integer, nullable=False, default=24)  # in hours
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'siteName': self.site_name,
            'maintenanceMode': self.maintenance_mode,
            'userRegistration': self.user_registration,
            'maxFileSize': self.max_file_size,
            'sessionTimeout': self.session_timeout,
            'defaultLanguage': self.default_language,
            'emailNotifications': self.email_notifications,
            'backupFrequency': self.backup_frequency,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }