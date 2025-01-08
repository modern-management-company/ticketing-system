from flask import request, jsonify
from app import app, db
from app.models import User, Ticket, Property, TaskAssignment, Room
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Invalid input'}), 400

    hashed_password = generate_password_hash(data['password'])
    user = User(username=data['username'], password=hashed_password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully!'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Invalid input'}), 400

    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password, data['password']):
        access_token = create_access_token(identity=user.user_id)
        return jsonify({'token': access_token}), 200
    return jsonify({'message': 'Invalid username or password'}), 401

@app.route('/tickets', methods=['POST'])
@jwt_required()
def create_ticket():
    data = request.json

    if not data or not data.get('title') or not data.get('description') or not data.get('priority'):
        return jsonify({'message': 'Invalid input'}), 400

    user_id = get_jwt_identity()  # Get the logged-in user's ID

    ticket = Ticket(
        title=data['title'],
        description=data['description'],
        priority=data['priority'],
        user_id=user_id
    )
    db.session.add(ticket)
    db.session.commit()
    return jsonify({'message': 'Ticket created successfully!'})

@app.route('/tickets', methods=['GET'])
@jwt_required()
def view_tickets():
    user_id = get_jwt_identity()  # Get the logged-in user's ID
    tickets = Ticket.query.filter_by(user_id=user_id).all()
    
    # Serialize ticket data
    ticket_list = [
        {
            'id': ticket.ticket_id,
            'title': ticket.title,
            'description': ticket.description,
            'status': ticket.status,
            'priority': ticket.priority,
        }
        for ticket in tickets
    ]
    return jsonify({'tickets': ticket_list}), 200

@app.route('/properties', methods=['POST'])
@jwt_required()
def create_property():
    data = request.json
    if not data or not data.get('name') or not data.get('address'):
        return jsonify({'message': 'Invalid input'}), 400

    property = Property(name=data['name'], address=data['address'])
    db.session.add(property)
    db.session.commit()
    return jsonify({'message': 'Property created successfully!', 'property_id': property.property_id})

@app.route('/properties/<int:property_id>/rooms', methods=['POST'])
@jwt_required()
def create_room(property_id):
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'message': 'Invalid input'}), 400

    property = Property.query.get(property_id)
    if not property:
        return jsonify({'message': 'Property not found'}), 404

    room = Room(name=data['name'], property_id=property_id)
    db.session.add(room)
    db.session.commit()
    return jsonify({'message': 'Room created successfully!', 'room_id': room.room_id})

@app.route('/assign-task', methods=['POST'])
@jwt_required()
def assign_task():
    data = request.json
    if not data or not data.get('ticket_id') or not data.get('user_id'):
        return jsonify({'message': 'Invalid input'}), 400

    ticket = Ticket.query.get(data['ticket_id'])
    user = User.query.get(data['user_id'])

    if not ticket or not user:
        return jsonify({'message': 'Invalid ticket or user ID'}), 404

    # Create a new task assignment
    task = TaskAssignment(
        ticket_id=data['ticket_id'],
        assigned_to_user_id=data['user_id'],
        status='Pending'
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'message': 'Task assigned successfully!', 'task_id': task.task_id})

@app.route('/tasks', methods=['GET'])
@jwt_required()
def view_tasks():
    tasks = TaskAssignment.query.all()

    task_list = [
        {
            'task_id': task.task_id,
            'ticket_id': task.ticket_id,
            'assigned_to': task.user.username,
            'status': task.status
        }
        for task in tasks
    ]
    return jsonify({'tasks': task_list})
@app.route('/tasks/<int:task_id>', methods=['PATCH'])
@jwt_required()
def update_task_status(task_id):
    data = request.json
    if not data or not data.get('status'):
        return jsonify({'message': 'Invalid input'}), 400

    task = TaskAssignment.query.get(task_id)
    if not task:
        return jsonify({'message': 'Task not found'}), 404

    task.status = data['status']
    db.session.commit()
    return jsonify({'message': 'Task status updated successfully!'})

@app.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    users = User.query.all()
    user_list = [{'user_id': user.user_id, 'username': user.username} for user in users]
    return jsonify({'users': user_list}), 200
@app.route('/properties', methods=['GET'])
@jwt_required()
def get_properties():
    properties = Property.query.all()
    property_list = [
        {
            'property_id': property.property_id,
            'name': property.name,
            'address': property.address
        }
        for property in properties
    ]
    return jsonify({'properties': property_list}), 200
@app.route('/properties/<int:property_id>/rooms', methods=['GET'])
@jwt_required()
def get_rooms(property_id):
    property = Property.query.get(property_id)
    if not property:
        return jsonify({'message': 'Property not found'}), 404

    rooms = Room.query.filter_by(property_id=property_id).all()
    room_list = [
        {
            'room_id': room.room_id,
            'name': room.name
        }
        for room in rooms
    ]
    return jsonify({'rooms': room_list}), 200
