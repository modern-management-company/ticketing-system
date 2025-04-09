from app.extensions import db
from datetime import datetime
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
    subscription_plan = db.Column(db.String(20), default='basic')  # 'basic' or 'premium'
    has_attachments = db.Column(db.Boolean, default=False)
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
            'subscription_plan': self.subscription_plan,
            'has_attachments': self.has_attachments,
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
    completed_at = db.Column(db.DateTime)  # When the ticket was completed

    # Add relationship to attachments
    attachments = db.relationship('TicketAttachment', backref='ticket', lazy=True)

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
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'property_id': self.property_id,
            'attachments': [attachment.to_dict() for attachment in self.attachments]
        }

class TicketAttachment(db.Model):
    __tablename__ = 'ticket_attachments'
    attachment_id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.ticket_id'), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50))
    file_size = db.Column(db.Integer)  # Size in bytes
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert attachment object to dictionary"""
        uploaded_by = User.query.get(self.uploaded_by_id)
        return {
            'attachment_id': self.attachment_id,
            'ticket_id': self.ticket_id,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'uploaded_by_id': self.uploaded_by_id,
            'uploaded_by_username': uploaded_by.username if uploaded_by else 'Unknown',
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class TaskAssignment(db.Model):
    __tablename__ = 'task_assignments'
    task_id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.ticket_id'), nullable=False)
    assigned_to_user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    status = db.Column(db.String(50), default='Pending')

    # Boolean column (defaults to False, meaning it's a Ticket)
    is_service_request = db.Column(db.Boolean, default=False)

    # Relationships
    ticket = db.relationship('Ticket', backref=db.backref('task_assignments', lazy=True))
    user = db.relationship('User', backref=db.backref('task_assignments', lazy=True))

    def get_task_type(self):
        """Determine if task is for a Ticket or Service Request."""
        return "Service Request" if self.is_service_request else "Ticket"

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
    completed_at = db.Column(db.DateTime)  # When the task was completed
    time_spent = db.Column(db.Float)  # Time spent in hours
    cost = db.Column(db.Float)  # Cost in dollars

    @property
    def completion_score(self):
        """Calculate a score based on completion time and due date"""
        if not self.completed_at or not self.created_at:
            return None

        # Calculate time taken to complete in hours
        time_taken = (self.completed_at - self.created_at).total_seconds() / 3600

        # Base score starts at 100
        score = 100

        # If there's a due date, adjust score based on completion time
        if self.due_date:
            # Calculate time difference from due date
            due_date_diff = (self.completed_at - self.due_date).total_seconds() / 3600
            
            # If completed before due date, add bonus points
            if due_date_diff < 0:
                # Add up to 20 bonus points for early completion
                bonus = min(20, abs(due_date_diff))
                score += bonus
            else:
                # Deduct points for late completion
                # Deduct up to 50 points for being late
                penalty = min(50, due_date_diff)
                score -= penalty

        # Adjust score based on priority
        priority_multiplier = {
            'Critical': 1.5,
            'High': 1.3,
            'Medium': 1.1,
            'Low': 1.0
        }.get(self.priority, 1.0)

        # Final score calculation
        final_score = score * priority_multiplier

        # Ensure score stays within 0-100 range
        return max(0, min(100, final_score))

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
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'time_spent': self.time_spent,
            'cost': self.cost,
            'completion_score': self.completion_score
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
    # Scheduler settings
    daily_report_hour = db.Column(db.Integer, default=18)  # Default to 6 PM
    daily_report_minute = db.Column(db.Integer, default=0)
    daily_report_timezone = db.Column(db.String(50), default='America/New_York')
    enable_daily_reports = db.Column(db.Boolean, default=True)
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
            'daily_report_hour': self.daily_report_hour,
            'daily_report_minute': self.daily_report_minute,
            'daily_report_timezone': self.daily_report_timezone,
            'enable_daily_reports': self.enable_daily_reports,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class SMSSettings(db.Model):
    __tablename__ = 'sms_settings'
    id = db.Column(db.Integer, primary_key=True)
    service_provider = db.Column(db.String(255), nullable=False)
    account_sid = db.Column(db.String(255), nullable=False)
    auth_token = db.Column(db.String(255), nullable=False)
    sender_phone = db.Column(db.String(20), nullable=False)
    enable_sms_notifications = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert SMS settings object to dictionary"""
        return {
            'id': self.id,
            'service_provider': self.service_provider,
            'account_sid': self.account_sid,
            'auth_token': self.auth_token,
            'sender_phone': self.sender_phone,
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

class History(db.Model):
    __tablename__ = 'history'
    history_id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(20), nullable=False)  # 'ticket' or 'task'
    entity_id = db.Column(db.Integer, nullable=False)  # ID of the ticket or task
    action = db.Column(db.String(50), nullable=False)  # 'created', 'updated', 'status_changed', 'assigned', etc.
    field_name = db.Column(db.String(50))  # Name of the field that was changed (for updates)
    old_value = db.Column(db.Text)  # Previous value
    new_value = db.Column(db.Text)  # New value
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='history_entries')

    def to_dict(self):
        return {
            'history_id': self.history_id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'action': self.action,
            'field_name': self.field_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def create_entry(cls, entity_type, entity_id, action, user_id, field_name=None, old_value=None, new_value=None):
        """Helper method to create a history entry"""
        entry = cls(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            user_id=user_id,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None
        )
        db.session.add(entry)
        db.session.commit()
        return entry

class AttachmentSettings(db.Model):
    __tablename__ = 'attachment_settings'
    id = db.Column(db.Integer, primary_key=True)
    storage_type = db.Column(db.String(20), default='local')  # local, s3, azure, etc.
    max_file_size = db.Column(db.Integer, default=16 * 1024 * 1024)  # 16MB default
    allowed_extensions = db.Column(db.JSON, default=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'])
    upload_folder = db.Column(db.String(255), default='uploads')
    
    # S3 specific settings
    s3_bucket_name = db.Column(db.String(255))
    s3_region = db.Column(db.String(50))
    s3_access_key = db.Column(db.String(255))
    s3_secret_key = db.Column(db.String(255))
    
    # Azure specific settings
    azure_account_name = db.Column(db.String(255))
    azure_account_key = db.Column(db.String(255))
    azure_container_name = db.Column(db.String(255))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert settings object to dictionary"""
        return {
            'id': self.id,
            'storage_type': self.storage_type,
            'max_file_size': self.max_file_size,
            'allowed_extensions': self.allowed_extensions,
            'upload_folder': self.upload_folder,
            's3_bucket_name': self.s3_bucket_name,
            's3_region': self.s3_region,
            's3_access_key': self.s3_access_key if self.s3_access_key else None,
            's3_secret_key': self.s3_secret_key if self.s3_secret_key else None,
            'azure_account_name': self.azure_account_name,
            'azure_account_key': self.azure_account_key if self.azure_account_key else None,
            'azure_container_name': self.azure_container_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }