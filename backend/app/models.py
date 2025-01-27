from app import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')  # user, manager, super_admin
    managed_property_id = db.Column(db.Integer, db.ForeignKey('properties.property_id', name='fk_user_managed_property'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # Define relationships
    managed_property = db.relationship('Property', 
                                     foreign_keys=[managed_property_id],
                                     backref='manager')
    
    # Many-to-many relationship with properties through UserProperty model
    assigned_properties = db.relationship(
        'Property',
        secondary='user_properties',
        backref=db.backref('assigned_users', lazy='dynamic')
    )

class Property(db.Model):
    __tablename__ = 'properties'
    property_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200))
    type = db.Column(db.String(50))
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    rooms = db.relationship('Room', backref='property', lazy=True)
    tickets = db.relationship('Ticket', backref='property', lazy=True)

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