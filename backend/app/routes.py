from flask import request, jsonify
from app import app, db
from app.models import User, Ticket, Property, TaskAssignment, Room, Activity
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from collections import defaultdict
from app.middleware import handle_errors

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    is_admin_registration = data.get('isAdminRegistration', False)
    
    # Check if this is the first user (for super_admin creation)
    if is_admin_registration:
        super_admin = User.query.filter_by(role='super_admin').first()
        if super_admin:
            return jsonify({'message': 'Super admin already exists'}), 403
        role = 'super_admin'
    else:
        role = 'user'  # Default role for normal registration

    # Check if username already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400

    # Create new user
    new_user = User(
        username=data['username'],
        password=generate_password_hash(data['password']),
        role=role
    )
    
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing username or password'}), 400

    user = User.query.filter_by(username=data['username']).first()
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Invalid username or password'}), 401

    access_token = create_access_token(identity=user.user_id)
    
    response = jsonify({
        'token': access_token,
        'userId': user.user_id,
        'username': user.username,
        'role': user.role,
        'managedPropertyId': user.managed_property_id,
        'assignedPropertyId': user.assigned_property_id
    })
    return response

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
def get_tickets():
    current_user = get_jwt_identity()
    
    # Build query based on role
    if current_user['role'] == 'super_admin':
        tickets = Ticket.query.all()
    elif current_user['role'] == 'manager':
        tickets = Ticket.query.filter_by(property_id=current_user['managed_property_id']).all()
    else:
        tickets = Ticket.query.filter_by(property_id=current_user['assigned_property_id']).all()

    ticket_data = []
    for ticket in tickets:
        creator = User.query.get(ticket.user_id)
        assigned_task = TaskAssignment.query.filter_by(ticket_id=ticket.ticket_id).first()
        assigned_user = None
        if assigned_task:
            assigned_user = User.query.get(assigned_task.assigned_to_user_id)

        ticket_data.append({
            'ticket_id': ticket.ticket_id,
            'title': ticket.title,
            'description': ticket.description,
            'status': ticket.status,
            'priority': ticket.priority,
            'category': ticket.category,
            'created_by_id': ticket.user_id,
            'created_by_username': creator.username if creator else 'Unknown',
            'assigned_to_username': assigned_user.username if assigned_user else 'Unassigned',
            'created_at': ticket.created_at.strftime('%Y-%m-%d %H:%M:%S') if ticket.created_at else None
        })

    return jsonify({'tickets': ticket_data})

@app.route('/properties', methods=['GET'])
@jwt_required()
def get_properties():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Super admin can see all properties
        if user.role == 'super_admin':
            properties = Property.query.all()
        # Manager can only see their managed property
        elif user.role == 'manager':
            properties = Property.query.filter_by(property_id=user.managed_property_id).all()
        # Regular users can see all their assigned properties
        else:
            properties = user.assigned_properties.all()

        properties_data = [{
            'property_id': prop.property_id,
            'name': prop.name,
            'address': prop.address,
            'type': prop.type,
            'status': prop.status,
            'manager_id': prop.manager_id
        } for prop in properties]

        return jsonify({'properties': properties_data})

    except Exception as e:
        print(f"Error in get_properties: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/properties', methods=['POST'])
@jwt_required()
def create_property():
    current_user = get_jwt_identity()
    if current_user['role'] != 'super_admin':
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.json
    if not data or not all(k in data for k in ['name', 'address', 'type']):
        return jsonify({'message': 'Missing required fields'}), 400

    property = Property(
        name=data['name'],
        address=data['address'],
        type=data['type'],
        status=data.get('status', 'active')
    )
    
    db.session.add(property)
    db.session.commit()

    return jsonify({
        'message': 'Property created successfully',
        'property': {
            'property_id': property.property_id,
            'name': property.name,
            'address': property.address,
            'type': property.type,
            'status': property.status
        }
    })

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
def get_tasks():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if user.role == 'super_admin':
        tasks = TaskAssignment.query.all()
    elif user.role == 'manager':
        tasks = TaskAssignment.query.join(Ticket).filter(Ticket.property_id == user.managed_property_id).all()
    else:
        tasks = TaskAssignment.query.join(Ticket).filter(Ticket.user_id == user.user_id).all()

    task_list = [{'task_id': task.task_id, 'ticket_id': task.ticket_id, 'status': task.status} for task in tasks]
    return jsonify({'tasks': task_list}), 200

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
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role == 'super_admin':
        users = User.query.all()
    elif current_user.role == 'manager':
        users = User.query.filter(User.assigned_properties.any(property_id=current_user.managed_property_id)).all()
    else:
        return jsonify({'message': 'Unauthorized'}), 403

    user_data = [{
        'user_id': user.user_id,
        'username': user.username,
        'role': user.role,
        'managed_property_id': user.managed_property_id,
        'assigned_properties': [{
            'property_id': prop.property_id,
            'name': prop.name
        } for prop in user.assigned_properties]
    } for user in users]
    
    return jsonify({'users': user_data})

@app.route('/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['super_admin', 'manager']:
        return jsonify({'message': 'Unauthorized'}), 403

    target_user = User.query.get_or_404(user_id)

    if request.method == 'GET':
        return jsonify({
            'user_id': target_user.user_id,
            'username': target_user.username,
            'role': target_user.role,
            'managed_property_id': target_user.managed_property_id,
            'assigned_property_id': target_user.assigned_property_id
        })

    elif request.method == 'PUT':
        data = request.get_json()
        if current_user.role == 'super_admin':
            if 'role' in data:
                target_user.role = data['role']
            if 'managed_property_id' in data:
                target_user.managed_property_id = data['managed_property_id']
        
        if 'assigned_property_id' in data:
            target_user.assigned_property_id = data['assigned_property_id']
        
        db.session.commit()
        return jsonify({'message': 'User updated successfully'})

    elif request.method == 'DELETE':
        if current_user.role != 'super_admin':
            return jsonify({'message': 'Unauthorized'}), 403
        db.session.delete(target_user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'})

@app.route('/properties', methods=['GET', 'POST'])
@jwt_required()
def properties():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if request.method == 'GET':
        if current_user.role == 'super_admin':
            properties = Property.query.all()
        elif current_user.role == 'manager':
            properties = Property.query.filter_by(property_id=current_user.managed_property_id).all()
        else:
            properties = Property.query.filter_by(property_id=current_user.assigned_property_id).all()

        return jsonify({
            'properties': [{
                'property_id': p.property_id,
                'name': p.name,
                'address': p.address,
                'type': p.type,
                'status': p.status,
                'manager_id': p.manager_id
            } for p in properties]
        })

    elif request.method == 'POST':
        if current_user.role != 'super_admin':
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json()
        new_property = Property(
            name=data['name'],
            address=data['address'],
            type=data['type'],
            status=data.get('status', 'active'),
            manager_id=data.get('manager_id')
        )
        db.session.add(new_property)
        db.session.commit()
        return jsonify({'message': 'Property created successfully', 'property_id': new_property.property_id}), 201

@app.route('/properties/<int:property_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_property(property_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    property = Property.query.get_or_404(property_id)

    if request.method == 'GET':
        return jsonify({
            'property_id': property.property_id,
            'name': property.name,
            'address': property.address,
            'type': property.type,
            'status': property.status,
            'manager_id': property.manager_id
        })

    if current_user.role != 'super_admin':
        return jsonify({'message': 'Unauthorized'}), 403

    if request.method == 'PUT':
        data = request.get_json()
        for key, value in data.items():
            setattr(property, key, value)
        db.session.commit()
        return jsonify({'message': 'Property updated successfully'})

    elif request.method == 'DELETE':
        db.session.delete(property)
        db.session.commit()
        return jsonify({'message': 'Property deleted successfully'})

@app.route('/rooms', methods=['GET', 'POST'])
@jwt_required()
def rooms():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if request.method == 'GET':
        if current_user.role == 'super_admin':
            rooms = Room.query.all()
        elif current_user.role == 'manager':
            rooms = Room.query.join(Property).filter(Property.property_id == current_user.managed_property_id).all()
        else:
            rooms = Room.query.filter_by(property_id=current_user.assigned_property_id).all()

        return jsonify({
            'rooms': [{
                'room_id': room.room_id,
                'name': room.name,
                'property_id': room.property_id
            } for room in rooms]
        })

    elif request.method == 'POST':
        if current_user.role not in ['super_admin', 'manager']:
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json()
        new_room = Room(
            name=data['name'],
            property_id=data['property_id']
        )
        db.session.add(new_room)
        db.session.commit()
        return jsonify({'message': 'Room created successfully', 'room_id': new_room.room_id}), 201

@app.route('/rooms/<int:room_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_room(room_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    room = Room.query.get_or_404(room_id)

    if request.method == 'GET':
        return jsonify({
            'room_id': room.room_id,
            'name': room.name,
            'property_id': room.property_id
        })

    if current_user.role not in ['super_admin', 'manager']:
        return jsonify({'message': 'Unauthorized'}), 403

    if request.method == 'PUT':
        data = request.get_json()
        for key, value in data.items():
            setattr(room, key, value)
        db.session.commit()
        return jsonify({'message': 'Room updated successfully'})

    elif request.method == 'DELETE':
        db.session.delete(room)
        db.session.commit()
        return jsonify({'message': 'Room deleted successfully'})

@app.route('/tasks', methods=['GET', 'POST'])
@jwt_required()
def tasks():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if request.method == 'GET':
        if current_user.role == 'super_admin':
            tasks = TaskAssignment.query.all()
        elif current_user.role == 'manager':
            tasks = TaskAssignment.query.join(Ticket).filter(
                Ticket.property_id == current_user.managed_property_id
            ).all()
        else:
            tasks = TaskAssignment.query.filter_by(assigned_to_user_id=current_user_id).all()

        return jsonify({
            'tasks': [{
                'task_id': task.task_id,
                'ticket_id': task.ticket_id,
                'assigned_to_user_id': task.assigned_to_user_id,
                'status': task.status
            } for task in tasks]
        })

    elif request.method == 'POST':
        if current_user.role not in ['super_admin', 'manager']:
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json()
        new_task = TaskAssignment(
            ticket_id=data['ticket_id'],
            assigned_to_user_id=data['assigned_to_user_id'],
            status=data.get('status', 'Pending')
        )
        db.session.add(new_task)
        db.session.commit()
        return jsonify({'message': 'Task created successfully', 'task_id': new_task.task_id}), 201

@app.route('/tasks/<int:task_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_task(task_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    task = TaskAssignment.query.get_or_404(task_id)

    if request.method == 'GET':
        return jsonify({
            'task_id': task.task_id,
            'ticket_id': task.ticket_id,
            'assigned_to_user_id': task.assigned_to_user_id,
            'status': task.status
        })

    if current_user.role not in ['super_admin', 'manager'] and task.assigned_to_user_id != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    if request.method == 'PUT':
        data = request.get_json()
        for key, value in data.items():
            setattr(task, key, value)
        db.session.commit()
        return jsonify({'message': 'Task updated successfully'})

    elif request.method == 'DELETE':
        if current_user.role not in ['super_admin', 'manager']:
            return jsonify({'message': 'Unauthorized'}), 403
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted successfully'})

@app.route('/reports/properties', methods=['GET'])
@jwt_required()
def property_report():
    properties = Property.query.all()
    property_data = [{
        'property_id': prop.property_id,
        'name': prop.name,
        'address': prop.address,
        'type': prop.type,
        'status': prop.status,
        'manager_id': prop.manager_id
    } for prop in properties]
    return jsonify({'properties': property_data})

@app.route('/reports/tasks', methods=['GET'])
@jwt_required()
def task_report():
    tasks = TaskAssignment.query.all()
    task_data = [{
        'task_id': task.task_id,
        'ticket_id': task.ticket_id,
        'assigned_to_user_id': task.assigned_to_user_id,
        'status': task.status
    } for task in tasks]
    return jsonify({'tasks': task_data})

@app.route('/reports/tickets', methods=['GET'])
@jwt_required()
def ticket_report():
    tickets = Ticket.query.all()
    ticket_data = [{
        'ticket_id': ticket.ticket_id,
        'title': ticket.title,
        'status': ticket.status,
        'priority': ticket.priority,
        'category': ticket.category,
        'user_id': ticket.user_id,
        'property_id': ticket.property_id,
        'created_at': ticket.created_at.strftime('%Y-%m-%d %H:%M:%S') if ticket.created_at else None
    } for ticket in tickets]
    return jsonify({'tickets': ticket_data})

@app.route('/switch_property', methods=['POST'])
@jwt_required()
def switch_property():
    user_id = get_jwt_identity()
    data = request.json
    new_property_id = data.get('property_id')

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    if user.role in ['super_admin', 'manager']:
        user.managed_property_id = new_property_id
        db.session.commit()
        return jsonify({'message': 'Property switched successfully'}), 200
    else:
        return jsonify({'message': 'Unauthorized access'}), 403

@app.route('/assign-property', methods=['POST'])
@jwt_required()
def assign_property():
    current_user = get_jwt_identity()
    if current_user['role'] not in ['super_admin', 'manager']:
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.json
    user_id = data.get('user_id')
    property_ids = data.get('property_ids')  # Now accepts an array of property IDs

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Clear existing assignments and add new ones
    user.assigned_properties = []
    for property_id in property_ids:
        property = Property.query.get(property_id)
        if property:
            user.assigned_properties.append(property)
    
    db.session.commit()
    return jsonify({'message': 'User property assignments updated successfully'})

@app.route('/remove-property-assignment', methods=['POST'])
@jwt_required()
def remove_property_assignment():
    current_user = get_jwt_identity()
    if current_user['role'] not in ['super_admin', 'manager']:
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.json
    user_id = data.get('user_id')
    property_id = data.get('property_id')

    user = User.query.get(user_id)
    property = Property.query.get(property_id)

    if not user or not property:
        return jsonify({'message': 'User or property not found'}), 404

    if property in user.assigned_properties:
        user.assigned_properties.remove(property)
        db.session.commit()

    return jsonify({'message': 'Property assignment removed successfully'})

@app.route('/users/<int:user_id>/properties', methods=['GET'])
@jwt_required()
def get_user_properties(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    properties = [{
        'property_id': prop.property_id,
        'name': prop.name,
        'address': prop.address,
        'type': prop.type,
        'status': prop.status
    } for prop in user.assigned_properties]

    return jsonify({'properties': properties})

@app.route('/users/<int:user_id>/managed-properties', methods=['GET'])
@jwt_required()
def get_managed_properties(user_id):
    current_user = get_jwt_identity()
    if current_user['user_id'] != user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)
    if not user or user.role != 'manager':
        return jsonify({'message': 'User not found or not a manager'}), 404

    properties = Property.query.filter_by(property_id=user.managed_property_id).all()
    return jsonify({
        'properties': [{'property_id': p.property_id, 'name': p.name} for p in properties]
    })

@app.route('/users/<int:user_id>/assigned-properties', methods=['GET'])
@jwt_required()
def get_assigned_properties(user_id):
    current_user = get_jwt_identity()
    if current_user['user_id'] != user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    properties = Property.query.filter_by(property_id=user.assigned_property_id).all()
    return jsonify({
        'properties': [{'property_id': p.property_id, 'name': p.name} for p in properties]
    })

@app.route('/properties/<int:property_id>/users', methods=['GET'])
@jwt_required()
def get_property_users(property_id):
    property = Property.query.get(property_id)
    if not property:
        return jsonify({'message': 'Property not found'}), 404

    users = User.query.filter(
        User.assigned_properties.any(property_id=property_id)
    ).all()

    return jsonify({
        'users': [{
            'user_id': user.user_id,
            'username': user.username,
            'role': user.role
        } for user in users]
    })

@app.route('/properties/<int:property_id>/tickets', methods=['GET'])
@jwt_required()
def get_property_tickets(property_id):
    current_user = get_jwt_identity()
    
    # Verify access rights
    if current_user['role'] == 'manager' and current_user['managed_property_id'] != property_id:
        return jsonify({'message': 'Unauthorized'}), 403
    elif current_user['role'] == 'user' and current_user['assigned_property_id'] != property_id:
        return jsonify({'message': 'Unauthorized'}), 403

    # Get tickets based on role
    if current_user['role'] in ['super_admin', 'manager']:
        tickets = Ticket.query.filter_by(property_id=property_id).all()
    else:
        tickets = Ticket.query.filter_by(
            property_id=property_id,
            user_id=current_user['user_id']
        ).all()

    return jsonify({
        'tickets': [{
            'ticket_id': t.ticket_id,
            'title': t.title,
            'description': t.description,
            'status': t.status,
            'priority': t.priority,
            'category': t.category
        } for t in tickets]
    })

@app.route('/properties/<int:property_id>/tasks', methods=['GET'])
@jwt_required()
def get_property_tasks(property_id):
    tasks = TaskAssignment.query.join(Ticket).filter(
        Ticket.property_id == property_id
    ).all()

    return jsonify({
        'tasks': [{
            'task_id': t.task_id,
            'ticket_id': t.ticket_id,
            'assigned_to_user_id': t.assigned_to_user_id,
            'assigned_to': User.query.get(t.assigned_to_user_id).username,
            'status': t.status,
            'ticket_title': t.ticket.title
        } for t in tasks]
    })

# User Profile and Password Management Routes
@app.route('/users/<int:user_id>/profile', methods=['GET'])
@jwt_required()
@handle_errors
def get_user_profile(user_id):
    current_user = get_jwt_identity()
    if current_user['user_id'] != user_id and current_user['role'] != 'super_admin':
        return jsonify({'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    property_name = None
    if user.assigned_property_id:
        property = Property.query.get(user.assigned_property_id)
        property_name = property.name if property else None

    return jsonify({
        'username': user.username,
        'role': user.role,
        'assigned_property_id': user.assigned_property_id,
        'assigned_property_name': property_name,
        'managed_property_id': user.managed_property_id
    })

@app.route('/users/<int:user_id>/change-password', methods=['POST'])
@jwt_required()
@handle_errors
def change_password(user_id):
    current_user = get_jwt_identity()
    if current_user['user_id'] != user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.json
    user = User.query.get(user_id)
    
    if not user or not check_password_hash(user.password, data['current_password']):
        return jsonify({'message': 'Invalid current password'}), 400

    user.password = generate_password_hash(data['new_password'])
    db.session.commit()
    
    return jsonify({'message': 'Password updated successfully'})

# Statistics Routes
@app.route('/statistics', methods=['GET'])
@jwt_required()
@handle_errors
def get_statistics():
    current_user = get_jwt_identity()
    if current_user['role'] != 'super_admin':
        return jsonify({'message': 'Unauthorized'}), 403

    date_range = request.args.get('range', 'week')
    if date_range == 'week':
        start_date = datetime.now() - timedelta(days=7)
    elif date_range == 'month':
        start_date = datetime.now() - timedelta(days=30)
    else:  # year
        start_date = datetime.now() - timedelta(days=365)

    # Get all statistics
    tickets = Ticket.query.filter(Ticket.created_at >= start_date).all()
    tasks = TaskAssignment.query.filter(TaskAssignment.created_at >= start_date).all()

    stats = calculate_statistics(tickets, tasks)
    return jsonify(stats)

@app.route('/properties/<int:property_id>/statistics', methods=['GET'])
@jwt_required()
@handle_errors
def get_property_statistics(property_id):
    current_user = get_jwt_identity()
    if current_user['role'] == 'manager' and current_user['managed_property_id'] != property_id:
        return jsonify({'message': 'Unauthorized'}), 403

    date_range = request.args.get('range', 'week')
    if date_range == 'week':
        start_date = datetime.now() - timedelta(days=7)
    elif date_range == 'month':
        start_date = datetime.now() - timedelta(days=30)
    else:  # year
        start_date = datetime.now() - timedelta(days=365)

    # Get property-specific statistics
    tickets = Ticket.query.filter(
        Ticket.property_id == property_id,
        Ticket.created_at >= start_date
    ).all()
    
    tasks = TaskAssignment.query.join(Ticket).filter(
        Ticket.property_id == property_id,
        TaskAssignment.created_at >= start_date
    ).all()

    stats = calculate_statistics(tickets, tasks)
    return jsonify(stats)

def calculate_statistics(tickets, tasks):
    # Calculate ticket statistics
    open_tickets = len([t for t in tickets if t.status == 'Open'])
    completed_tickets = len([t for t in tickets if t.status == 'Completed'])
    
    # Calculate average resolution time
    resolution_times = []
    for ticket in tickets:
        if ticket.status == 'Completed' and ticket.completed_at:
            delta = ticket.completed_at - ticket.created_at
            resolution_times.append(delta.total_seconds() / 3600)  # Convert to hours
    
    avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0

    # Calculate task statistics
    active_tasks = len([t for t in tasks if t.status != 'Completed'])
    completed_tasks = len([t for t in tasks if t.status == 'Completed'])
    completion_rate = (completed_tasks / len(tasks) * 100) if tasks else 0

    # Calculate category distribution
    categories = {}
    for ticket in tickets:
        categories[ticket.category] = categories.get(ticket.category, 0) + 1

    return {
        'tickets': {
            'open': open_tickets,
            'completed': completed_tickets,
            'avgResolutionTime': round(avg_resolution_time, 2)
        },
        'tasks': {
            'active': active_tasks,
            'completed': completed_tasks,
            'completionRate': round(completion_rate, 2)
        },
        'categories': categories
    }

@app.route('/dashboard/stats', methods=['GET'])
@jwt_required()
@handle_errors
def get_dashboard_stats():
    current_user = get_jwt_identity()
    property_id = request.args.get('property_id', type=int)

    # Validate access
    if property_id and current_user['role'] == 'manager' and current_user['managed_property_id'] != property_id:
        return jsonify({'message': 'Unauthorized'}), 403

    # Base query filters
    filters = []
    if property_id:
        filters.append(Ticket.property_id == property_id)

    # Calculate statistics
    tickets = Ticket.query.filter(*filters).all()
    tasks = TaskAssignment.query.join(Ticket).filter(*filters).all()

    # Calculate ticket distribution
    status_counts = defaultdict(int)
    priority_counts = defaultdict(int)
    resolution_times = []

    for ticket in tickets:
        status_counts[ticket.status] += 1
        priority_counts[ticket.priority] += 1
        if ticket.status == 'Completed' and ticket.completed_at:
            delta = ticket.completed_at - ticket.created_at
            resolution_times.append(delta.total_seconds() / 3600)

    # Calculate task statistics
    active_tasks = len([t for t in tasks if t.status != 'Completed'])
    total_tasks = len(tasks)
    completed_tasks = total_tasks - active_tasks

    return jsonify({
        'openTickets': status_counts['Open'],
        'activeTasks': active_tasks,
        'resolutionRate': round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2),
        'avgResponseTime': round(sum(resolution_times) / len(resolution_times) if resolution_times else 0, 2),
        'ticketDistribution': [
            {'status': status, 'count': count}
            for status, count in status_counts.items()
        ],
        'priorityDistribution': [
            {'priority': priority, 'value': count}
            for priority, count in priority_counts.items()
        ]
    })

@app.route('/dashboard/activities', methods=['GET'])
@jwt_required()
@handle_errors
def get_recent_activities():
    current_user = get_jwt_identity()
    property_id = request.args.get('property_id', type=int)

    # Validate access
    if property_id and current_user['role'] == 'manager' and current_user['managed_property_id'] != property_id:
        return jsonify({'message': 'Unauthorized'}), 403

    # Get recent activities
    activities = Activity.query
    if property_id:
        activities = activities.filter(Activity.property_id == property_id)
    
    activities = activities.order_by(Activity.timestamp.desc()).limit(10).all()

    return jsonify({
        'activities': [{
            'type': activity.type,
            'description': activity.description,
            'timestamp': activity.timestamp.isoformat(),
            'user_id': activity.user_id
        } for activity in activities]
    })

@app.route('/users/check-first', methods=['GET'])
def check_first_user():
    # Check if any user exists
    user_count = User.query.count()
    return jsonify({'isFirstUser': user_count == 0})
