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
    category = data.get('category', 'General')  # Default category to 'General' if not provided

    ticket = Ticket(
        title=data['title'],
        description=data['description'],
        priority=data['priority'],
        category=category,
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
            'category': ticket.category,
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
def update_task(task_id):
    data = request.json

    if not data or ('status' not in data and 'assigned_to_user_id' not in data):
        return jsonify({'message': 'Invalid input'}), 400

    task = TaskAssignment.query.get(task_id)
    if not task:
        return jsonify({'message': 'Task not found'}), 404

    # Update status if provided
    if 'status' in data:
        task.status = data['status']

    # Update assigned user if provided
    if 'assigned_to_user_id' in data:
        new_user_id = data['assigned_to_user_id']
        user = User.query.get(new_user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        task.assigned_to_user_id = new_user_id

    db.session.commit()
    return jsonify({'message': 'Task updated successfully!'})

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

@app.route('/tickets/<int:ticket_id>', methods=['PATCH'])
@jwt_required()
def update_ticket(ticket_id):
    data = request.json
    print("Received data:", data)  # Debug print
    print("Ticket ID:", ticket_id)  # Debug print
    
    if not data:
        return jsonify({'message': 'Invalid input'}), 400
    
    ticket = Ticket.query.get(ticket_id)
    print("Found ticket:", ticket)  # Debug print
    
    if not ticket:
        return jsonify({'message': 'Ticket not found'}), 404
    
    # Update fields if provided in the request body
    if 'title' in data:
        print("Updating title to:", data['title'])  # Debug print
        ticket.title = data['title']
    if 'description' in data:
        ticket.description = data['description']
    if 'priority' in data:
        ticket.priority = data['priority']
    if 'category' in data:
        ticket.category = data['category']
    if 'status' in data:
        ticket.status = data['status']
    
    try:
        db.session.commit()
        print("Database commit successful")  # Debug print
        return jsonify({'message': 'Ticket updated successfully!'})
    except Exception as e:
        print("Database error:", str(e))  # Debug print
        db.session.rollback()
        return jsonify({'message': 'Database error occurred'}), 500
@app.route('/properties/<int:property_id>', methods=['PATCH'])
@jwt_required()
def edit_property(property_id):
    data = request.json
    if not data or not data.get('name') or not data.get('address'):
        return jsonify({'message': 'Invalid input'}), 400

    property = Property.query.get(property_id)
    if not property:
        return jsonify({'message': 'Property not found'}), 404

    property.name = data['name']
    property.address = data['address']
    db.session.commit()
    return jsonify({'message': 'Property updated successfully!'})

@app.route('/properties/<int:property_id>', methods=['DELETE'])
@jwt_required()
def delete_property(property_id):
    property = Property.query.get(property_id)
    if not property:
        return jsonify({'message': 'Property not found'}), 404

    db.session.delete(property)
    db.session.commit()
    return jsonify({'message': 'Property deleted successfully!'})
@app.route('/rooms/<int:room_id>', methods=['PATCH'])
@jwt_required()
def edit_room(room_id):
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'message': 'Invalid input'}), 400

    room = Room.query.get(room_id)
    if not room:
        return jsonify({'message': 'Room not found'}), 404

    room.name = data['name']
    db.session.commit()
    return jsonify({'message': 'Room updated successfully!'})

@app.route('/rooms/<int:room_id>', methods=['DELETE'])
@jwt_required()
def delete_room(room_id):
    room = Room.query.get(room_id)
    if not room:
        return jsonify({'message': 'Room not found'}), 404

    db.session.delete(room)
    db.session.commit()
    return jsonify({'message': 'Room deleted successfully!'})
@app.route('/tasks/<int:task_id>', methods=['PATCH'])
@jwt_required()
def edit_task(task_id):
    data = request.json
    if not data or not data.get('status'):
        return jsonify({'message': 'Invalid input'}), 400

    task = TaskAssignment.query.get(task_id)
    if not task:
        return jsonify({'message': 'Task not found'}), 404

    task.status = data['status']
    db.session.commit()
    return jsonify({'message': 'Task updated successfully!'})

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    task = TaskAssignment.query.get(task_id)
    if not task:
        return jsonify({'message': 'Task not found'}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted successfully!'})

@app.route('/tickets/<int:ticket_id>', methods=['DELETE'])
@jwt_required()
def delete_ticket(ticket_id):
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'message': 'Ticket not found'}), 404

    db.session.delete(ticket)
    db.session.commit()
    return jsonify({'message': 'Ticket deleted successfully!'})
@app.route('/users/<int:user_id>', methods=['PATCH'])
@jwt_required()
def edit_user(user_id):
    data = request.json
    if not data or not data.get('username'):
        return jsonify({'message': 'Invalid input'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    user.username = data['username']
    if data.get('password'):
        user.password = generate_password_hash(data['password'])
    db.session.commit()
    return jsonify({'message': 'User updated successfully!'})

@app.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully!'})

@app.route('/reports/users', methods=['GET'])
@jwt_required()
def user_report():
    users = User.query.all()
    user_data = [{'user_id': user.user_id, 'username': user.username} for user in users]
    return jsonify({'users': user_data})

@app.route('/reports/properties', methods=['GET'])
@jwt_required()
def property_report():
    properties = Property.query.all()
    property_data = [{'property_id': prop.property_id, 'name': prop.name, 'address': prop.address} for prop in properties]
    return jsonify({'properties': property_data})

@app.route('/reports/tasks', methods=['GET'])
@jwt_required()
def task_report():
    tasks = TaskAssignment.query.all()
    task_data = [
        {
            'task_id': task.task_id,
            'ticket_id': task.ticket_id,
            'assigned_to_user_id': task.assigned_to_user_id,
            'status': task.status
        }
        for task in tasks
    ]
    return jsonify({'tasks': task_data})

@app.route('/reports/tickets', methods=['GET'])
@jwt_required()
def ticket_report():
    tickets = Ticket.query.all()
    ticket_data = [
        {
            'ticket_id': ticket.ticket_id,
            'title': ticket.title,
            'status': ticket.status,
            'priority': ticket.priority,
        }
        for ticket in tickets
    ]
    return jsonify({'tickets': ticket_data})
