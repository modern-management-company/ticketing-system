from app import db
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))  # Add phone field
    role = db.Column(db.String(20), default='user')  # user, manager, super_admin
    group = db.Column(db.String(50))  # Added group field
    manager_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)

    # Define relationships
    team_members = db.relationship('User', 
                                 backref=db.backref('manager', remote_side=[user_id]),
                                 foreign_keys=[manager_id])
    
    managed_properties = db.relationship('Property',
                                       secondary='property_managers',
                                       backref=db.backref('managers', lazy='dynamic'),
                                       lazy='dynamic')
    
    assigned_properties = db.relationship('Property',
                                        secondary='user_properties',
                                        backref=db.backref('assigned_users', lazy='dynamic'),
                                        lazy='dynamic')
    
    assigned_tasks = db.relationship('Task',
                                   backref='assigned_to',
                                   lazy='dynamic',
                                   foreign_keys='Task.assigned_to_id')

    def __init__(self, username, email, password, role='user', manager_id=None, group=None, phone=None):
        self.username = username
        self.email = email
        self.set_password(password)
        self.role = role
        self.manager_id = manager_id
        self.group = group
        self.phone = phone

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
            'email': self.email,
            'group': self.group,
            'assigned_properties': [
                {
                    'property_id': prop.property_id,
                    'name': prop.name
                } for prop in self.assigned_properties
            ]
        }
        
        # Convert datetime objects to ISO format strings
        additional_claims = {
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'csrf': None  # Disable CSRF for now
        }
        
        # If no expires_delta is provided, use the default from app config
        if expires_delta is None:
            expires_delta = timedelta(days=7)  # Default to 7 days
        
        return create_access_token(
            identity=identity,
            expires_delta=expires_delta,
            additional_claims=additional_claims
        )

    def to_dict(self):
        """Convert user object to dictionary"""
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'group': self.group,
            'manager_id': self.manager_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active,
            'assigned_properties': [
                {
                    'property_id': prop.property_id,
                    'name': prop.name,
                    'address': prop.address,
                    'type': prop.type,
                    'status': prop.status
                } for prop in self.assigned_properties
            ],
            'managed_properties': [
                {
                    'property_id': prop.property_id,
                    'name': prop.name,
                    'address': prop.address,
                    'type': prop.type,
                    'status': prop.status
                } for prop in self.managed_properties
            ] if self.role == 'manager' else []
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
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    rooms = db.relationship('Room', backref='property', lazy=True)
    tickets = db.relationship('Ticket', backref='property', lazy=True)
    tasks = db.relationship('Task', backref='property', lazy=True)

    def to_dict(self):
        """Convert property object to dictionary"""
        return {
            'property_id': self.property_id,
            'name': self.name,
            'address': self.address,
            'type': self.type,
            'status': self.status,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Room(db.Model):
    __tablename__ = 'rooms'
    room_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'), nullable=False)
    type = db.Column(db.String(50), default='standard')
    floor = db.Column(db.Integer)
    status = db.Column(db.String(20), default='available')
    capacity = db.Column(db.Integer)
    amenities = db.Column(db.JSON, default=list)
    description = db.Column(db.Text)
    last_cleaned = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'room_id': self.room_id,
            'name': self.name,
            'property_id': self.property_id,
            'type': self.type,
            'floor': self.floor,
            'status': self.status,
            'capacity': self.capacity,
            'amenities': self.amenities or [],
            'description': self.description,
            'last_cleaned': self.last_cleaned.isoformat() if self.last_cleaned else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Ticket(db.Model):
    __tablename__ = 'tickets'
    ticket_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='open')
    priority = db.Column(db.String(20), nullable=False)
    category = db.Column(db.String(50))
    subcategory = db.Column(db.String(50))  # Add subcategory field
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'))
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.room_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert ticket object to dictionary"""
        creator = User.query.get(self.user_id)
        room = Room.query.get(self.room_id) if self.room_id else None
        
        return {
            'ticket_id': self.ticket_id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'category': self.category,
            'subcategory': self.subcategory,
            'room_id': self.room_id,
            'room_name': room.name if room else None,
            'created_by_id': self.user_id,
            'created_by_username': creator.username if creator else 'Unknown',
            'created_by_group': creator.group if creator else 'Unknown',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'property_id': self.property_id
        }

class TaskAssignment(db.Model):
    __tablename__ = 'task_assignments'
    task_id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.ticket_id'), nullable=False)
    assigned_to_user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    status = db.Column(db.String(50), default='Pending')

    ticket = db.relationship('Ticket', backref=db.backref('task_assignments', lazy=True))
    user = db.relationship('User', backref=db.backref('task_assignments', lazy=True))

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
    priority = db.Column(db.String(20), default='Low')
    due_date = db.Column(db.DateTime)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'))
    assigned_to_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert task object to dictionary"""
        return {
            'task_id': self.task_id,
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

class PropertyManager(db.Model):
    __tablename__ = 'property_managers'
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class EmailSettings(db.Model):
    __tablename__ = 'email_settings'
    id = db.Column(db.Integer, primary_key=True)
    smtp_server = db.Column(db.String(255), nullable=False)
    smtp_port = db.Column(db.Integer, nullable=False)
    smtp_username = db.Column(db.String(255), nullable=False)
    smtp_password = db.Column(db.String(255), nullable=False)
    sender_email = db.Column(db.String(255), nullable=False)
    enable_email_notifications = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert email settings object to dictionary"""
        return {
            'id': self.id,
            'smtp_server': self.smtp_server,
            'smtp_port': self.smtp_port,
            'smtp_username': self.smtp_username,
            'smtp_password': self.smtp_password,
            'sender_email': self.sender_email,
            'enable_email_notifications': self.enable_email_notifications,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class SMSSettings(db.Model):
    __tablename__ = 'sms_settings'
    id = db.Column(db.Integer, primary_key=True)
    account_sid = db.Column(db.String(255), nullable=False)
    auth_token = db.Column(db.String(255), nullable=False)
    from_number = db.Column(db.String(50), nullable=False)
    enable_sms_notifications = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert the model to a dictionary for API responses"""
        return {
            'id': self.id,
            'account_sid': self.account_sid,
            'auth_token': '••••••••••••••••••••••',  # Mask the auth token for security
            'from_number': self.from_number,
            'enable_sms_notifications': self.enable_sms_notifications,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ServiceRequest(db.Model):
    __tablename__ = 'service_requests'
    request_id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.room_id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id'), nullable=False)
    request_group = db.Column(db.String(50), nullable=False)  # 'Housekeeping', 'Front Desk', 'Engineering'
    request_type = db.Column(db.String(50), nullable=False)  # Specific type within the group
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    quantity = db.Column(db.Integer, default=1)
    guest_name = db.Column(db.String(100))
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    assigned_task_id = db.Column(db.Integer, db.ForeignKey('tasks.task_id'))

    # Relationships
    room = db.relationship('Room', backref='service_requests')
    property = db.relationship('Property', backref='service_requests')
    created_by = db.relationship('User', foreign_keys=[created_by_id], backref='created_requests')
    assigned_task = db.relationship('Task', backref='service_request')

    def to_dict(self):
        return {
            'request_id': self.request_id,
            'room_id': self.room_id,
            'property_id': self.property_id,
            'request_group': self.request_group,
            'request_type': self.request_type,
            'priority': self.priority,
            'quantity': self.quantity,
            'guest_name': self.guest_name,
            'notes': self.notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_by_id': self.created_by_id,
            'assigned_task_id': self.assigned_task_id,
            'room_number': self.room.name if self.room else None,
            'property_name': self.property.name if self.property else None,
            'created_by_name': self.created_by.username if self.created_by else None,
            'task_status': self.assigned_task.status if self.assigned_task else None
        }