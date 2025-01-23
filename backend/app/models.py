from app import db
from datetime import datetime

# Association table for User-Property many-to-many relationship
user_properties = db.Table('user_properties',
    db.Column('user_id', db.Integer, db.ForeignKey('user.user_id'), primary_key=True),
    db.Column('property_id', db.Integer, db.ForeignKey('property.property_id'), primary_key=True)
)

class User(db.Model):
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')  # user, manager, super_admin
    managed_property_id = db.Column(db.Integer, db.ForeignKey('property.property_id'))  # One manager per property
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # Many-to-many relationship for assigned properties
    assigned_properties = db.relationship('Property', 
                                        secondary=user_properties,
                                        backref=db.backref('assigned_users', lazy='dynamic'),
                                        lazy='dynamic')

class Ticket(db.Model):
    ticket_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='open')
    priority = db.Column(db.String(20), nullable=False)
    category = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('property.property_id'))
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

class Property(db.Model):
    property_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='active')
    manager_id = db.Column(db.Integer, db.ForeignKey('user.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    manager = db.relationship('User', 
                            backref='managed_properties', 
                            foreign_keys=[manager_id])
    rooms = db.relationship('Room', backref='property', lazy=True)
    tickets = db.relationship('Ticket', backref='property', lazy=True)

class Room(db.Model):
    room_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('property.property_id'), nullable=False)
    
class TaskAssignment(db.Model):
    task_id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('ticket.ticket_id'), nullable=False)
    assigned_to_user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    status = db.Column(db.String(50), default='Pending')

    ticket = db.relationship('Ticket', backref=db.backref('task_assignments', lazy=True))
    user = db.relationship('User', backref=db.backref('task_assignments', lazy=True))

class Activity(db.Model):
    activity_id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)  # 'ticket', 'task', 'user', 'property'
    description = db.Column(db.String(200), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('property.property_id'), nullable=True)

    # Relationships
    user = db.relationship('User', backref='activities')
    property = db.relationship('Property', backref='activities')