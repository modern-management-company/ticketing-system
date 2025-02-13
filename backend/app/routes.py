from flask import request, jsonify, current_app
from app import app, db
from app.models import User, Ticket, Property, TaskAssignment, Room, Activity, UserProperty, PropertyTheme, SystemSettings
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from collections import defaultdict
from app.middleware import handle_errors
from app.decorators import handle_errors
import logging

def get_user_from_jwt():
    """Helper function to get user from JWT identity"""
    identity = get_jwt_identity()
    if not identity or 'user_id' not in identity:
        return None
    return User.query.get(identity['user_id'])

# Authentication and verification routes
@app.route('/check-first-user', methods=['GET'])
def check_first_user():
    """Check if this is the first user being created (for super admin setup)"""
    try:
        is_first = User.query.count() == 0
        return jsonify({"isFirstUser": is_first}), 200
    except Exception as e:
        app.logger.error(f"Error checking first user: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify if the current token is valid and return user info"""
    try:
        identity = get_jwt_identity()
        if not identity or 'user_id' not in identity:
            return jsonify({"valid": False, "msg": "Invalid token format"}), 401
            
        current_user = User.query.get(identity['user_id'])
        if not current_user:
            return jsonify({"valid": False, "msg": "User not found"}), 401
            
        if not current_user.is_active:
            return jsonify({"valid": False, "msg": "User account is inactive"}), 401
            
        return jsonify({
            "valid": True,
            "user": current_user.to_dict()
        }), 200
    except Exception as e:
        app.logger.error(f"Error verifying token: {str(e)}")
        return jsonify({"valid": False, "msg": "Invalid token"}), 401

@app.route('/ping', methods=['GET'])
def health_check():
    app.logger.info("Health check endpoint called")
    return jsonify({"status": "healthy", "message": "Server is running"}), 200

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"msg": "No input data provided"}), 400

        # Validate required fields
        required_fields = ['username', 'email', 'password']
        if not all(field in data for field in required_fields):
            return jsonify({"msg": "Missing required fields"}), 400

        # Check if username or email already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"msg": "Username already exists"}), 400
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"msg": "Email already exists"}), 400

        # Check if this is the first user (for super_admin creation)
        is_first_user = User.query.count() == 0
        role = 'super_admin' if is_first_user else data.get('role', 'user')

        # Create new user
        new_user = User(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            role=role,
            manager_id=data.get('manager_id')
        )
        
        db.session.add(new_user)
        db.session.commit()

        # Generate token
        access_token = new_user.get_token()

        app.logger.info(f"User registered successfully: {new_user.username}")
        return jsonify({
            "msg": "User registered successfully",
            "token": access_token,
            "user": new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Registration error: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/login', methods=['POST'])
def login():
    """Handle user login and token generation"""
    try:
        data = request.get_json()
        if not data:
            app.logger.warning("Login attempt with no data")
            return jsonify({"msg": "No input data provided"}), 400

        # Check for required fields
        if not data.get('username') or not data.get('password'):
            app.logger.warning("Login attempt with missing credentials")
            return jsonify({"msg": "Missing username or password"}), 400

        # Find user by username
        user = User.query.filter_by(username=data['username']).first()
        if not user:
            app.logger.warning(f"Login attempt with non-existent username: {data['username']}")
            return jsonify({"msg": "Invalid username or password"}), 401

        if not user.check_password(data['password']):
            app.logger.warning(f"Failed login attempt for username: {data['username']} - Invalid password")
            return jsonify({"msg": "Invalid username or password"}), 401

        if not user.is_active:
            app.logger.warning(f"Login attempt for inactive user: {data['username']}")
            return jsonify({"msg": "Account is inactive"}), 401

        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()

        # Generate token with user data
        user_data = user.to_dict()
        access_token = user.get_token()
        
        app.logger.info(f"Successful login for user: {user.username}")
        return jsonify({
            "msg": "Login successful",
            "token": access_token,
            "user": user_data
        }), 200

    except Exception as e:
        app.logger.error(f"Login error: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/tickets', methods=['POST'])
@jwt_required()
def create_ticket():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        data = request.json
        if not data or not data.get('title') or not data.get('description') or not data.get('priority'):
            return jsonify({'msg': 'Invalid input'}), 400

        ticket = Ticket(
            title=data['title'],
            description=data['description'],
            priority=data['priority'],
            category=data.get('category', 'General'),
            user_id=current_user.user_id,
            property_id=data.get('property_id')
        )
        db.session.add(ticket)
        db.session.commit()

        app.logger.info(f"Ticket created by user {current_user.username}: {ticket.ticket_id}")
        return jsonify({'msg': 'Ticket created successfully', 'ticket': ticket.ticket_id}), 201

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating ticket: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/tickets', methods=['GET'])
@jwt_required()
def get_tickets():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            app.logger.error("User not found from JWT")
            return jsonify({"msg": "User not found"}), 404
            
        app.logger.info(f"Getting tickets for user {current_user.username} with role {current_user.role}")
        
        if current_user.role == 'super_admin':
            tickets = Ticket.query.all()
            app.logger.info(f"Super admin: Found {len(tickets)} tickets")
        elif current_user.role == 'manager':
            # Managers can see tickets from their properties
            properties = Property.query.filter_by(manager_id=current_user.user_id).all()
            property_ids = [p.property_id for p in properties]
            tickets = Ticket.query.filter(Ticket.property_id.in_(property_ids)).all()
            app.logger.info(f"Manager: Found {len(tickets)} tickets")
        else:
            # Regular users can see tickets from their assigned properties
            property_ids = [prop.property_id for prop in current_user.assigned_properties]
            tickets = Ticket.query.filter(Ticket.property_id.in_(property_ids)).all()
            app.logger.info(f"User: Found {len(tickets)} tickets")

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
                'created_at': ticket.created_at.strftime('%Y-%m-%d %H:%M:%S') if ticket.created_at else None,
                'property_id': ticket.property_id
            })

        return jsonify({'tickets': ticket_data})
    except Exception as e:
        app.logger.error(f"Error in get_tickets: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/properties', methods=['GET'])
@jwt_required()
def get_properties():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            app.logger.error("User not found from JWT")
            return jsonify({"msg": "User not found"}), 404
            
        app.logger.info(f"Getting properties for user {current_user.username} with role {current_user.role}")
        
        if current_user.role == 'super_admin':
            properties = Property.query.all()
            app.logger.info(f"Super admin: Found {len(properties)} properties")
        elif current_user.role == 'manager':
            # Managers can see properties they manage
            properties = current_user.managed_properties.all()
            app.logger.info(f"Manager: Found {len(properties)} properties")
        else:
            # Regular users can see properties they're assigned to
            properties = current_user.assigned_properties.all()
            app.logger.info(f"User: Found {len(properties)} properties")
            
        return jsonify([prop.to_dict() for prop in properties]), 200
        
    except Exception as e:
        app.logger.error(f"Error in get_properties: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/properties', methods=['POST'])
@jwt_required()
def create_property():
    try:
        # Get current user
        current_user = get_user_from_jwt()
        if not current_user:
            app.logger.error("User not found from JWT")
            return jsonify({"msg": "User not found"}), 404
            
        app.logger.info(f"User role: {current_user.role}")
        if current_user.role not in ['super_admin', 'manager']:
            app.logger.warning(f"Unauthorized property creation attempt by user {current_user.user_id} with role {current_user.role}")
            return jsonify({"msg": "Unauthorized - Insufficient permissions"}), 403
            
        # Get and validate input data
        data = request.get_json()
        app.logger.info(f"Received property data: {data}")
        
        if not data:
            app.logger.error("No input data provided")
            return jsonify({"msg": "No input data provided"}), 400
            
        # Validate required fields
        required_fields = ['name', 'address']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            app.logger.error(f"Missing required fields: {missing_fields}")
            return jsonify({"msg": f"Missing required fields: {', '.join(missing_fields)}"}), 400
            
        # Create new property
        new_property = Property(
            name=data['name'],
            address=data['address'],
            type=data.get('type', 'residential'),
            status=data.get('status', 'active'),
            description=data.get('description', ''),
            manager_id=current_user.user_id if current_user.role == 'manager' else data.get('manager_id')
        )
        
        db.session.add(new_property)
        
        # If manager is creating the property, assign them to it
        if current_user.role == 'manager':
            user_property = UserProperty(user_id=current_user.user_id, property_id=new_property.property_id)
            db.session.add(user_property)
            
        db.session.commit()
        app.logger.info(f"Property created successfully: {new_property.property_id}")
        return jsonify({"msg": "Property created successfully", "property": new_property.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating property: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/properties/<int:property_id>/rooms', methods=['GET'])
@jwt_required()
def get_property_rooms(property_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            app.logger.error("User not found from JWT")
            return jsonify({"msg": "User not found"}), 404

        # Check if user has access to this property
        if current_user.role == 'super_admin':
            property = Property.query.get(property_id)
        elif current_user.role == 'manager':
            property = Property.query.filter_by(property_id=property_id, manager_id=current_user.user_id).first()
        else:
            property = Property.query.join(UserProperty).filter(
                Property.property_id == property_id,
                UserProperty.user_id == current_user.user_id
            ).first()

        if not property:
            app.logger.warning(f"User {current_user.user_id} attempted to access rooms for property {property_id}")
            return jsonify({"msg": "Property not found or access denied"}), 404

        rooms = Room.query.filter_by(property_id=property_id).all()
        return jsonify({
            'rooms': [{
                'room_id': room.room_id,
                'name': room.name,
                'type': room.type,
                'floor': room.floor,
                'status': room.status
            } for room in rooms]
        }), 200

    except Exception as e:
        app.logger.error(f"Error getting property rooms: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/properties/<int:property_id>/rooms', methods=['POST'])
@jwt_required()
def create_property_room(property_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            app.logger.error("User not found from JWT")
            return jsonify({"msg": "User not found"}), 404

        # Check if user has permission to manage this property
        if current_user.role == 'super_admin':
            property = Property.query.get(property_id)
        elif current_user.role == 'manager':
            property = Property.query.filter_by(property_id=property_id, manager_id=current_user.user_id).first()
        else:
            app.logger.warning(f"User {current_user.user_id} attempted to create room without permission")
            return jsonify({"msg": "Unauthorized"}), 403

        if not property:
            app.logger.warning(f"Property {property_id} not found or access denied")
            return jsonify({"msg": "Property not found or access denied"}), 404

        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({"msg": "Room name is required"}), 400

        new_room = Room(
            name=data['name'],
            property_id=property_id,
            type=data.get('type', 'standard'),
            floor=data.get('floor'),
            status=data.get('status', 'available')
        )

        db.session.add(new_room)
        db.session.commit()

        app.logger.info(f"Room created successfully for property {property_id}")
        return jsonify({
            "msg": "Room created successfully",
            "room": {
                'room_id': new_room.room_id,
                'name': new_room.name,
                'type': new_room.type,
                'floor': new_room.floor,
                'status': new_room.status
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating room: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/properties/<int:property_id>/rooms/<int:room_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_property_room(property_id, room_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            app.logger.error("User not found from JWT")
            return jsonify({"msg": "User not found"}), 404

        # Check if user has permission to manage this property
        if current_user.role == 'super_admin':
            property = Property.query.get(property_id)
        elif current_user.role == 'manager':
            property = Property.query.filter_by(property_id=property_id, manager_id=current_user.user_id).first()
        else:
            property = Property.query.join(UserProperty).filter(
                Property.property_id == property_id,
                UserProperty.user_id == current_user.user_id
            ).first()

        if not property:
            app.logger.warning(f"Property {property_id} not found or access denied")
            return jsonify({"msg": "Property not found or access denied"}), 404

        room = Room.query.filter_by(room_id=room_id, property_id=property_id).first()
        if not room:
            return jsonify({"msg": "Room not found"}), 404

        if request.method == 'GET':
            return jsonify({
                'room_id': room.room_id,
                'name': room.name,
                'type': room.type,
                'floor': room.floor,
                'status': room.status
            })

        # Only managers and super_admins can modify rooms
        if current_user.role not in ['super_admin', 'manager']:
            app.logger.warning(f"User {current_user.user_id} attempted to modify room without permission")
            return jsonify({"msg": "Unauthorized"}), 403

        if request.method == 'PUT':
            data = request.get_json()
            if data.get('name'):
                room.name = data['name']
            if data.get('type'):
                room.type = data['type']
            if 'floor' in data:
                room.floor = data['floor']
            if data.get('status'):
                room.status = data['status']

            db.session.commit()
            app.logger.info(f"Room {room_id} updated successfully")
            return jsonify({"msg": "Room updated successfully"})

        elif request.method == 'DELETE':
            db.session.delete(room)
            db.session.commit()
            app.logger.info(f"Room {room_id} deleted successfully")
            return jsonify({"msg": "Room deleted successfully"})

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error managing room: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

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
@handle_errors
def get_tasks():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'message': 'User not found'}), 404

        # Get tasks based on user role
        if current_user.role == 'super_admin':
            tasks = TaskAssignment.query.all()
        elif current_user.role == 'manager':
            # Get tasks for properties managed by this manager
            managed_properties = Property.query.filter_by(manager_id=current_user.user_id).all()
            property_ids = [p.property_id for p in managed_properties]
            tasks = TaskAssignment.query.join(Ticket).filter(Ticket.property_id.in_(property_ids)).all()
        else:
            # Regular users see tasks assigned to them
            tasks = TaskAssignment.query.filter_by(assigned_to_user_id=current_user.user_id).all()

        # Format task data
        task_list = []
        for task in tasks:
            ticket = Ticket.query.get(task.ticket_id)
            assigned_user = User.query.get(task.assigned_to_user_id)
            task_list.append({
                'task_id': task.task_id,
                'ticket_id': task.ticket_id,
                'ticket_title': ticket.title if ticket else 'Unknown',
                'ticket_priority': ticket.priority if ticket else 'Normal',
                'status': task.status,
                'assigned_to_user_id': task.assigned_to_user_id,
                'assigned_to': assigned_user.username if assigned_user else 'Unassigned'
            })
        
        return jsonify({'tasks': task_list}), 200
    except Exception as e:
        app.logger.error(f"Error in get_tasks: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

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
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            app.logger.error("User not found from JWT")
            return jsonify({"msg": "User not found"}), 404
            
        app.logger.info(f"Getting users list for user {current_user.username} with role {current_user.role}")
        
        if current_user.role == 'super_admin':
            users = User.query.all()
        elif current_user.role == 'manager':
            # Managers can see their team members
            users = current_user.team_members
        else:
            # Regular users can only see themselves
            users = [current_user]
            
        return jsonify({"users": [user.to_dict() for user in users]}), 200
        
    except Exception as e:
        app.logger.error(f"Error in get_users: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_user(user_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        if current_user.role not in ['super_admin', 'manager']:
            return jsonify({'msg': 'Unauthorized'}), 403

        target_user = User.query.get_or_404(user_id)

        if request.method == 'GET':
            return jsonify(target_user.to_dict())

        elif request.method == 'PUT':
            data = request.get_json()
            
            # Only super_admin can change roles
            if current_user.role == 'super_admin' and 'role' in data:
                target_user.role = data['role']
            
            # Update other fields
            if 'email' in data:
                target_user.email = data['email']
            if 'is_active' in data:
                target_user.is_active = data['is_active']
            if 'manager_id' in data and current_user.role == 'super_admin':
                target_user.manager_id = data['manager_id']
            
            db.session.commit()
            app.logger.info(f"User {target_user.username} updated by {current_user.username}")
            return jsonify({'msg': 'User updated successfully'})

        elif request.method == 'DELETE':
            if current_user.role != 'super_admin':
                return jsonify({'msg': 'Unauthorized'}), 403
                
            db.session.delete(target_user)
            db.session.commit()
            app.logger.info(f"User {target_user.username} deleted by {current_user.username}")
            return jsonify({'msg': 'User deleted successfully'})

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in manage_user: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

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

@app.route('/assign-property', methods=['POST'])
@jwt_required()
def assign_property():
    current_user = get_jwt_identity()
    if current_user['role'] not in ['super_admin', 'manager']:
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    user_id = data.get('user_id')
    property_ids = data.get('property_ids', [])

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Clear existing property assignments
    UserProperty.query.filter_by(user_id=user_id).delete()

    # Add new property assignments
    for property_id in property_ids:
        property = Property.query.get(property_id)
        if property:
            user_property = UserProperty(user_id=user_id, property_id=property_id)
            db.session.add(user_property)

    try:
        db.session.commit()
        return jsonify({'message': 'Property assignments updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error updating property assignments: {str(e)}'}), 500

@app.route('/remove-property-assignment', methods=['POST'])
@jwt_required()
def remove_property_assignment():
    current_user = get_jwt_identity()
    if current_user['role'] not in ['super_admin', 'manager']:
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    user_id = data.get('user_id')
    property_id = data.get('property_id')

    if not user_id or not property_id:
        return jsonify({'message': 'Missing required fields'}), 400

    user = User.query.get(user_id)
    property = Property.query.get(property_id)

    if not user or not property:
        return jsonify({'message': 'User or property not found'}), 404

    user_property = UserProperty.query.filter_by(
        user_id=user_id,
        property_id=property_id
    ).first()

    if user_property:
        db.session.delete(user_property)
        db.session.commit()
        return jsonify({'message': 'Property assignment removed successfully'})
    else:
        return jsonify({'message': 'Property assignment not found'}), 404

@app.route('/users/<int:user_id>/properties', methods=['GET'])
@jwt_required()
def get_user_properties(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    properties = [{
        'property_id': prop.property_id,
        'name': prop.name,
        'address': prop.address
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

    if user.managed_property:
        properties = [user.managed_property]
    else:
        properties = []

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

    return jsonify({
        'properties': [{
            'property_id': p.property_id,
            'name': p.name
        } for p in user.assigned_properties]
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
    try:
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
            if ticket.status == 'Completed' and hasattr(ticket, 'completed_at') and ticket.completed_at:
                delta = ticket.completed_at - ticket.created_at
                resolution_times.append(delta.total_seconds() / 3600)

        # Calculate task statistics
        active_tasks = len([t for t in tasks if t.status != 'Completed'])
        total_tasks = len(tasks)
        completed_tasks = total_tasks - active_tasks

        return jsonify({
            'openTickets': status_counts.get('Open', 0),
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
        }), 200
    except Exception as e:
        app.logger.error(f"Error in get_dashboard_stats: {str(e)}")
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

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

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    app.logger.warning(f"404 error: {request.url}")
    return jsonify({"msg": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    app.logger.error(f"500 error: {str(error)}")
    return jsonify({"msg": "Internal server error"}), 500

# Property Theme Settings Routes
@app.route('/settings/property/theme', methods=['GET'])
@jwt_required()
@handle_errors
def get_property_theme():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get the property ID from query params or use the first property for the user
        property_id = request.args.get('property_id', type=int)
        if not property_id:
            if current_user.role == 'super_admin':
                property = Property.query.first()
            elif current_user.role == 'manager':
                property = Property.query.filter_by(manager_id=current_user.user_id).first()
            else:
                property = current_user.assigned_properties[0] if current_user.assigned_properties else None
            
            if not property:
                return jsonify({'error': 'No property found'}), 404
            property_id = property.property_id

        # Check if user has access to this property
        if current_user.role != 'super_admin':
            has_access = False
            if current_user.role == 'manager':
                has_access = Property.query.filter_by(property_id=property_id, manager_id=current_user.user_id).first() is not None
            else:
                has_access = any(p.property_id == property_id for p in current_user.assigned_properties)
            
            if not has_access:
                return jsonify({'error': 'Access denied'}), 403

        theme = PropertyTheme.query.filter_by(property_id=property_id).first()
        if not theme:
            # Create default theme if it doesn't exist
            theme = PropertyTheme(
                property_id=property_id,
                primary_color='#1976d2',
                secondary_color='#dc004e',
                background_color='#ffffff',
                accent_color='#2196f3'
            )
            db.session.add(theme)
            db.session.commit()

        return jsonify({
            'colors': {
                'primary': theme.primary_color,
                'secondary': theme.secondary_color,
                'background': theme.background_color,
                'accent': theme.accent_color
            }
        }), 200

    except Exception as e:
        app.logger.error(f'Error in get_property_theme: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/settings/property/theme', methods=['POST'])
@jwt_required()
@handle_errors
def update_property_theme():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        if not data or 'colors' not in data:
            return jsonify({'error': 'Invalid request data'}), 400

        property_id = request.args.get('property_id', type=int)
        if not property_id:
            if current_user.role == 'super_admin':
                property = Property.query.first()
            elif current_user.role == 'manager':
                property = Property.query.filter_by(manager_id=current_user.user_id).first()
            else:
                property = current_user.assigned_properties[0] if current_user.assigned_properties else None
            
            if not property:
                return jsonify({'error': 'No property found'}), 404
            property_id = property.property_id

        # Check if user has access to this property
        if current_user.role != 'super_admin':
            has_access = False
            if current_user.role == 'manager':
                has_access = Property.query.filter_by(property_id=property_id, manager_id=current_user.user_id).first() is not None
            else:
                has_access = any(p.property_id == property_id for p in current_user.assigned_properties)
            
            if not has_access:
                return jsonify({'error': 'Access denied'}), 403

        theme = PropertyTheme.query.filter_by(property_id=property_id).first()
        if not theme:
            theme = PropertyTheme(property_id=property_id)
            db.session.add(theme)

        colors = data['colors']
        theme.primary_color = colors.get('primary', theme.primary_color)
        theme.secondary_color = colors.get('secondary', theme.secondary_color)
        theme.background_color = colors.get('background', theme.background_color)
        theme.accent_color = colors.get('accent', theme.accent_color)

        db.session.commit()
        return jsonify({
            'colors': {
                'primary': theme.primary_color,
                'secondary': theme.secondary_color,
                'background': theme.background_color,
                'accent': theme.accent_color
            }
        }), 200

    except Exception as e:
        app.logger.error(f'Error in update_property_theme: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

# System Settings Routes
@app.route('/api/settings/system', methods=['GET'])
@jwt_required()
def get_system_settings():
    try:
        current_user = get_user_from_jwt()
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Access denied'}), 403

        settings = SystemSettings.query.first()
        if not settings:
            # Create default settings if they don't exist
            settings = SystemSettings()
            db.session.add(settings)
            db.session.commit()

        return jsonify(settings.to_dict()), 200

    except Exception as e:
        app.logger.error(f'Error in get_system_settings: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/settings/system', methods=['POST'])
@jwt_required()
def update_system_settings():
    try:
        current_user = get_user_from_jwt()
        if current_user.role != 'super_admin':
            return jsonify({'error': 'Access denied'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        settings = SystemSettings.query.first()
        if not settings:
            settings = SystemSettings()
            db.session.add(settings)

        # Update settings with provided values
        settings.site_name = data.get('siteName', settings.site_name)
        settings.maintenance_mode = data.get('maintenanceMode', settings.maintenance_mode)
        settings.user_registration = data.get('userRegistration', settings.user_registration)
        settings.max_file_size = data.get('maxFileSize', settings.max_file_size)
        settings.session_timeout = data.get('sessionTimeout', settings.session_timeout)
        settings.default_language = data.get('defaultLanguage', settings.default_language)
        settings.email_notifications = data.get('emailNotifications', settings.email_notifications)
        settings.backup_frequency = data.get('backupFrequency', settings.backup_frequency)

        db.session.commit()
        return jsonify(settings.to_dict()), 200

    except Exception as e:
        app.logger.error(f'Error in update_system_settings: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500
