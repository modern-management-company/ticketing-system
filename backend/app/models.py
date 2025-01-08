from app import db

class User(db.Model):
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class Ticket(db.Model):
    ticket_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='Open')
    priority = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'))

class Property(db.Model):
    property_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    rooms = db.relationship('Room', backref='property', lazy=True)

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
