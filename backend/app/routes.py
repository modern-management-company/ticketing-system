from flask import request, jsonify, current_app
from app import app, db
from app.models import User, Ticket, Property, TaskAssignment, Room, UserProperty, Task, PropertyManager, EmailSettings, ServiceRequest
from app.services import EmailService, EmailTestService
import os
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from collections import defaultdict
from app.middleware import handle_errors
from app.decorators import handle_errors
import logging
import secrets
from sqlalchemy import or_
from app.services.sms_service import SMSService

def get_user_from_jwt():
    """Helper function to get user from JWT identity"""
    identity = get_jwt_identity()
    if not identity or 'user_id' not in identity:
        return None
    return User.query.get(identity['user_id'])

def generate_password_reset_token():
    """Generate a secure token for password reset"""
    return secrets.token_urlsafe(32)

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

        # Store the original password for email
        original_password = data['password']

        # Create new user
        new_user = User(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            role=role,
            manager_id=data.get('manager_id'),
            group=data.get('group'),
            phone=data.get('phone')  # Add phone field
        )
        
        db.session.add(new_user)
        db.session.commit()

        # Send welcome email with credentials
        email_service = EmailService()
        email_sent = email_service.send_user_registration_email(new_user, original_password, None)
        
        if not email_sent:
            app.logger.warning(f"Failed to send welcome email to {new_user.email}")

        # Generate token
        access_token = new_user.get_token()

        app.logger.info(f"User registered successfully: {new_user.username}")
        return jsonify({
            "msg": "User registered successfully. Please check your email for login credentials.",
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
        data = request.get_json()
        required_fields = ['title', 'description', 'priority', 'category', 'property_id']
        
        # Validate required fields
        for field in required_fields:
            if not data.get(field):
                return jsonify({'msg': f'Missing required field: {field}'}), 400

        # Get the current user
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'msg': 'User not found'}), 404

        # Create new ticket
        new_ticket = Ticket(
            title=data['title'],
            description=data['description'],
            priority=data['priority'],
            category=data['category'],
            subcategory=data.get('subcategory'),  # Optional field
            property_id=data['property_id'],
            user_id=current_user.user_id,
            room_id=data.get('room_id')  # Optional field
        )

        # If room_id is provided, validate it exists and belongs to the property
        if data.get('room_id'):
            room = Room.query.filter_by(
                room_id=data['room_id'],
                property_id=data['property_id']
            ).first()
            
            if not room:
                return jsonify({'msg': 'Invalid room_id or room does not belong to the property'}), 400

            # Update room status based on ticket category
            if data['category'] == 'Maintenance':
                room.status = 'Maintenance'
            elif data['category'] == 'Housekeeping':
                room.status = 'Cleaning'
            elif room.status == 'Available':  # Only change if room is available
                room.status = 'Out of Order'

        try:
            db.session.add(new_ticket)
            db.session.commit()

            # Enhanced category to group mapping for task assignment
            category = data['category']
            
            # Map category to group name
            group_mapping = {
                'Maintenance': 'Engineering',
                'Housekeeping': 'Housekeeping',
                'Front Desk': 'Front Desk',
                'General': 'Front Desk',
                'IT': 'IT',
                'Security': 'Security',
                'Food & Beverage': 'Food & Beverage',
                'Accounting': 'Accounting'
                # Add more mappings as needed
            }
            
            # Get the appropriate group for this category
            assigned_group = group_mapping.get(category)
            assigned_manager = None
            
            if assigned_group:
                # First try to find a manager with the specific group for this property
                assigned_manager = User.query.filter_by(
                    group=assigned_group,
                    is_active=True
                ).join(PropertyManager).filter(
                    PropertyManager.property_id == data['property_id']
                ).first()
                
                # If no specific manager found, assign to Executive Manager
                if not assigned_manager and category not in ['Maintenance', 'Housekeeping', 'Front Desk']:
                    assigned_manager = User.query.filter_by(
                        group='Executive',
                        is_active=True
                    ).join(PropertyManager).filter(
                        PropertyManager.property_id == data['property_id']
                    ).first()
            
            # If still no manager found, try to find any Executive Manager for this property
            if not assigned_manager:
                assigned_manager = User.query.filter_by(
                    group='Executive',
                    is_active=True
                ).join(PropertyManager).filter(
                    PropertyManager.property_id == data['property_id']
                ).first()
            
            # Create and assign a task if we found a manager
            if assigned_manager:
                # Create and assign a task
                task = Task(
                    title=f"Task for Ticket #{new_ticket.ticket_id}: {data['title']}",
                    description=f"Auto-generated task for ticket. Category: {category}\nDescription: {data['description']}",
                    status='pending',
                    priority=data['priority'],
                    property_id=data['property_id'],
                    assigned_to_id=assigned_manager.user_id
                )
                db.session.add(task)
                db.session.flush()  # This will populate the task_id
                
                # Create task assignment
                task_assignment = TaskAssignment(
                    task_id=task.task_id,
                    ticket_id=new_ticket.ticket_id,
                    assigned_to_user_id=assigned_manager.user_id,
                    status='Pending'
                )
                db.session.add(task_assignment)
                
                # Log the assignment
                app.logger.info(f"Auto-assigned task for ticket #{new_ticket.ticket_id} to {assigned_manager.username} (Group: {assigned_manager.group})")
                
                # Send email notification to the assigned manager
                try:
                    property_name = "Unknown Property"
                    property_obj = Property.query.get(data['property_id'])
                    if property_obj:
                        property_name = property_obj.name
                        
                    from app.services.email_service import EmailService
                    email_service = EmailService()
                    email_service.send_task_assignment_notification(assigned_manager, task, property_name)
                except Exception as e:
                    app.logger.error(f"Failed to send task assignment email: {str(e)}")
                
                db.session.commit()

            # Get property managers and super admins for notifications
            property_managers = User.query.join(PropertyManager).filter(
                PropertyManager.property_id == data['property_id'],
                User.is_active == True
            ).all()
            super_admins = User.query.filter_by(role='super_admin').all()
            
            # Combine recipients and remove duplicates
            recipients = list(set(property_managers + super_admins))
            
            # Get property name for notification
            property_name = Property.query.get(data['property_id']).name

            # Send notifications
            from app.services.email_service import EmailService
            email_service = EmailService()
            notifications_sent = email_service.send_ticket_notification(
                new_ticket,
                property_name,
                recipients,
                notification_type="new"
            )

            response_data = {
                'msg': 'Ticket created successfully',
                'ticket': new_ticket.to_dict(),
                'notifications_sent': notifications_sent > 0
            }
            
            if assigned_manager:
                response_data['task_created'] = True
                response_data['assigned_to'] = {
                    'user_id': assigned_manager.user_id,
                    'username': assigned_manager.username,
                    'group': assigned_manager.group
                }

            return jsonify(response_data), 201

        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error creating ticket: {str(e)}")
            return jsonify({'msg': 'Failed to create ticket'}), 500

    except Exception as e:
        app.logger.error(f"Error in create_ticket: {str(e)}")
        return jsonify({'msg': 'Internal server error'}), 500

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
            app.logger.warning(f"Unauthorized property creation attempt by user {current_user.user_id}")
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
            description=data.get('description', '')
        )
        
        db.session.add(new_property)
        db.session.flush()  # Get the property_id
        
        # If manager is creating the property, create property manager relationship
        if current_user.role == 'manager':
            property_manager = PropertyManager(
                property_id=new_property.property_id,
                user_id=current_user.user_id
            )
            db.session.add(property_manager)
            
        db.session.commit()
        app.logger.info(f"Property created successfully: {new_property.property_id}")
        return jsonify({"msg": "Property created successfully", "property": new_property.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating property: {str(e)}")
        return jsonify({"msg": f"Error creating property: {str(e)}"}), 500

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
            property = Property.query.filter(
                Property.property_id == property_id,
                Property.managers.any(user_id=current_user.user_id)
            ).first()
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
            'rooms': [room.to_dict() for room in rooms]
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

@app.route('/properties/<int:property_id>/rooms/<int:room_id>', methods=['GET', 'PUT', 'DELETE', 'PATCH'])
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
            # Use the PropertyManager relationship to check if user manages this property
            property = Property.query.filter(
                Property.property_id == property_id,
                Property.managers.any(user_id=current_user.user_id)
            ).first()
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
            return jsonify(room.to_dict())

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
            return jsonify({"msg": "Room updated successfully", "room": room.to_dict()})

        elif request.method == 'DELETE':
            # Check if room has any associated tickets
            tickets = Ticket.query.filter_by(room_id=room_id).first()
            if tickets:
                app.logger.warning(f"Cannot delete room {room_id} as it has associated tickets")
                return jsonify({"msg": "Cannot delete room that has associated tickets. Please reassign or resolve all tickets first."}), 400

            db.session.delete(room)
            db.session.commit()
            app.logger.info(f"Room {room_id} deleted successfully")
            return jsonify({"msg": "Room deleted successfully"})

        elif request.method == 'PATCH':
            data = request.get_json()
            old_status = room.status

            # Update room fields
            for field in ['name', 'type', 'floor', 'status', 'capacity', 'description']:
                if field in data:
                    setattr(room, field, data[field])

            db.session.commit()

            # Send notifications if status was changed
            if 'status' in data and old_status != room.status:
                # Get all managers and admins for this property
                property_managers = User.query.join(PropertyManager).filter(
                    PropertyManager.property_id == property.property_id
                ).all()
                
                super_admins = User.query.filter_by(role='super_admin').all()
                
                # Combine unique recipients
                recipients = list(set(property_managers + super_admins))

                # Send email notifications
                email_service = EmailService()
                email_service.send_room_status_notification(
                    room=room,
                    property_name=property.name,
                    old_status=old_status,
                    new_status=room.status,
                    recipients=recipients
                )

            return jsonify({
                "msg": "Property updated successfully",
                "property": property.to_dict()
            }), 200

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error managing room: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/assign-task', methods=['POST'])
@jwt_required()
def assign_task():
    try:
        data = request.json
        if not data or not data.get('ticket_id') or not data.get('user_id'):
            return jsonify({'message': 'Invalid input'}), 400

        ticket = Ticket.query.get(data['ticket_id'])
        user = User.query.get(data['user_id'])

        if not ticket or not user:
            return jsonify({'message': 'Invalid ticket or user ID'}), 404

        # Map ticket status to task status
        task_status = 'completed' if ticket.status == 'completed' else \
                     'in progress' if ticket.status == 'in progress' else \
                     'pending'

        # Create a new Task first
        task = Task(
            title=f"[Ticket #{ticket.ticket_id}] {ticket.title}",
            description=ticket.description,
            status=task_status,  # Use mapped status
            priority=ticket.priority,  # Sync priority with ticket
            property_id=ticket.property_id,
            assigned_to_id=data['user_id']
        )
        db.session.add(task)
        db.session.flush()  # Get the task_id

        # Create a new task assignment
        task_assignment = TaskAssignment(
            task_id=task.task_id,
            ticket_id=data['ticket_id'],
            assigned_to_user_id=data['user_id'],
            status=task_status  # Use mapped status
        )
        db.session.add(task_assignment)
        db.session.commit()

        # Send email notification
        try:
            property_name = "Unknown Property"
            if ticket.property_id:
                property = Property.query.get(ticket.property_id)
                if property:
                    property_name = property.name

            email_service = EmailService()
            email_sent = email_service.send_task_assignment_notification(user, task, property_name)
            app.logger.info(f"Task assignment email {'sent successfully' if email_sent else 'failed to send'} to {user.email}")
        except Exception as e:
            app.logger.error(f"Failed to send task assignment email: {str(e)}")
            # Don't return error, just log it since the task was created successfully

        return jsonify({
            'message': 'Task assigned successfully!', 
            'task_id': task.task_id,
            'email_sent': email_sent if 'email_sent' in locals() else False
        })

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in assign_task: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/tasks', methods=['GET'])
@jwt_required()
@handle_errors
def get_tasks():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'message': 'User not found'}), 404

        # Base query joining Task and TaskAssignment
        base_query = db.session.query(Task, TaskAssignment).outerjoin(
            TaskAssignment, Task.task_id == TaskAssignment.task_id
        )

        # Get tasks based on user role
        if current_user.role == 'super_admin':
            tasks_query = base_query
        elif current_user.role == 'manager':
            # Get tasks for properties managed by this manager
            managed_properties = Property.query.join(PropertyManager).filter(
                PropertyManager.user_id == current_user.user_id
            ).all()
            property_ids = [p.property_id for p in managed_properties]
            tasks_query = base_query.filter(Task.property_id.in_(property_ids))
        else:
            # Regular users see tasks assigned to them or in their group
            tasks_query = base_query.filter(
                db.or_(
                    Task.assigned_to_id == current_user.user_id,  # Tasks directly assigned
                    TaskAssignment.assigned_to_user_id == current_user.user_id  # Tasks assigned through tickets
                )
            )

        # Execute query and format results
        task_list = []
        for task, task_assignment in tasks_query.all():
            task_data = task.to_dict()
            
            # Add task assignment information if exists
            if task_assignment:
                ticket = Ticket.query.get(task_assignment.ticket_id)
                task_data.update({
                    'ticket_id': task_assignment.ticket_id,
                    'ticket_title': ticket.title if ticket else None,
                    'ticket_status': task_assignment.status
                })
            
            # Add assigned user information
            if task.assigned_to_id:
                assigned_user = User.query.get(task.assigned_to_id)
                task_data['assigned_to'] = assigned_user.username if assigned_user else 'Unknown'
                task_data['assigned_to_group'] = assigned_user.group if assigned_user else None
            
            task_list.append(task_data)
        
        return jsonify({'tasks': task_list}), 200

    except Exception as e:
        app.logger.error(f"Error in get_tasks: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/tasks/<int:task_id>', methods=['GET', 'PUT', 'PATCH', 'DELETE'])
@jwt_required()
def manage_task(task_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        task = Task.query.get_or_404(task_id)
        if not task:
            return jsonify({"msg": "Task not found"}), 404

        # Check authorization
        if current_user.role not in ['super_admin', 'manager'] and task.assigned_to_id != current_user.user_id:
            return jsonify({'msg': 'Unauthorized'}), 403

        if request.method == 'GET':
            # Get associated ticket information if exists
            task_assignment = TaskAssignment.query.filter_by(task_id=task_id).first()
            task_data = task.to_dict()
            if task_assignment:
                ticket = Ticket.query.get(task_assignment.ticket_id)
                task_data.update({
                    'ticket_id': task_assignment.ticket_id,
                    'ticket_status': ticket.status if ticket else task_assignment.status,
                    'ticket_priority': ticket.priority if ticket else None
                })
            return jsonify(task_data)

        elif request.method in ['PUT', 'PATCH']:
            data = request.get_json()
            if not data:
                return jsonify({'msg': 'No input data provided'}), 400

            app.logger.info(f"Updating task {task_id} with data: {data}")

            # Store old values for notification purposes
            old_assignee_id = task.assigned_to_id
            old_status = task.status
            old_priority = task.priority

            # Update task fields
            if 'title' in data:
                task.title = data['title']
            if 'description' in data:
                task.description = data['description']
            if 'status' in data:
                task.status = data['status']
                # Update associated task assignment and ticket
                task_assignment = TaskAssignment.query.filter_by(task_id=task_id).first()
                if task_assignment:
                    task_assignment.status = data['status']
                    ticket = Ticket.query.get(task_assignment.ticket_id)
                    if ticket:
                        # Map task status to ticket status
                        if data['status'] == 'completed':
                            ticket.status = 'completed'
                        elif data['status'] == 'in progress':
                            ticket.status = 'in progress'
                        elif data['status'] == 'pending':
                            ticket.status = 'open'
            if 'priority' in data:
                task.priority = data['priority']
                # Update associated ticket priority
                task_assignment = TaskAssignment.query.filter_by(task_id=task_id).first()
                if task_assignment:
                    ticket = Ticket.query.get(task_assignment.ticket_id)
                    if ticket:
                        ticket.priority = data['priority']
            if 'assigned_to_id' in data:
                task.assigned_to_id = data['assigned_to_id']
                # Update task assignment if exists
                task_assignment = TaskAssignment.query.filter_by(task_id=task_id).first()
                if task_assignment:
                    task_assignment.assigned_to_user_id = data['assigned_to_id']
            if 'due_date' in data:
                task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%dT%H:%M:%S.%fZ') if data['due_date'] else None

            task.updated_at = datetime.utcnow()
            
            try:
                db.session.commit()
                app.logger.info(f"Successfully updated task {task_id}")

                # Send email notification if assignee was changed
                notifications_sent = False
                if 'assigned_to_id' in data and data['assigned_to_id'] != old_assignee_id:
                    try:
                        assigned_user = User.query.get(data['assigned_to_id'])
                        property = Property.query.get(task.property_id)
                        if assigned_user and property:
                            email_service = EmailService()
                            notifications_sent = email_service.send_task_assignment_notification(
                                assigned_user,
                                task,
                                property.name
                            )
                            app.logger.info(f"Task assignment email {'sent successfully' if notifications_sent else 'failed to send'} to {assigned_user.email}")
                    except Exception as e:
                        app.logger.error(f"Failed to send task assignment email: {str(e)}")

                # Get the updated task with user information
                task_data = task.to_dict()
                assigned_user = User.query.get(task.assigned_to_id) if task.assigned_to_id else None
                task_data['assigned_to'] = assigned_user.username if assigned_user else None

                # Add task assignment information if exists
                task_assignment = TaskAssignment.query.filter_by(task_id=task_id).first()
                if task_assignment:
                    task_data['ticket_id'] = task_assignment.ticket_id
                    task_data['ticket_status'] = task_assignment.status

                return jsonify({
                    'msg': 'Task updated successfully',
                    'task': task_data,
                    'notifications_sent': notifications_sent
                })

            except Exception as e:
                db.session.rollback()
                app.logger.error(f"Database error while updating task: {str(e)}")
                return jsonify({'msg': 'Failed to update task'}), 500

        elif request.method == 'DELETE':
            if current_user.role not in ['super_admin', 'manager']:
                return jsonify({'msg': 'Unauthorized'}), 403
                
            # Delete associated task assignment if exists
            task_assignment = TaskAssignment.query.filter_by(task_id=task_id).first()
            if task_assignment:
                db.session.delete(task_assignment)
                
            db.session.delete(task)
            db.session.commit()
            return jsonify({'msg': 'Task deleted successfully'})

    except Exception as e:
        app.logger.error(f"Error in manage_task endpoint: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/properties/<int:property_id>/tasks', methods=['GET'])
@jwt_required()
def get_property_tasks(property_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        # Verify access to property
        if current_user.role == 'user':
            has_access = any(p.property_id == property_id for p in current_user.assigned_properties)
            if not has_access:
                return jsonify({'msg': 'Unauthorized access to property'}), 403
        elif current_user.role == 'manager':
            has_access = any(p.property_id == property_id for p in current_user.managed_properties)
            if not has_access:
                return jsonify({'msg': 'Unauthorized access to property'}), 403

        # Get tasks based on user role and property
        tasks = Task.query.filter_by(property_id=property_id)
        
        if current_user.role == 'user':
            # Users only see tasks assigned to them
            tasks = tasks.filter_by(assigned_to_id=current_user.user_id)

        tasks = tasks.all()
        
        # Format tasks with user information
        task_list = []
        for task in tasks:
            assigned_user = User.query.get(task.assigned_to_id) if task.assigned_to_id else None
            task_data = task.to_dict()
            task_data['assigned_to'] = assigned_user.username if assigned_user else None
            task_list.append(task_data)

        return jsonify({'tasks': task_list}), 200

    except Exception as e:
        app.logger.error(f"Error in get_property_tasks: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/tasks', methods=['POST'])
@jwt_required()
def create_task():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'msg': 'No input data provided'}), 400

        # Validate required fields
        required_fields = ['title', 'description', 'priority', 'property_id']
        if not all(field in data for field in required_fields):
            return jsonify({'msg': 'Missing required fields'}), 400

        # Create the task
        task = Task(
            title=data['title'],
            description=data['description'],
            priority=data['priority'],
            property_id=data['property_id'],
            status=data.get('status', 'pending'),
            assigned_to_id=data.get('assigned_to_id'),
            due_date=datetime.strptime(data['due_date'], '%Y-%m-%dT%H:%M:%S.%fZ') if 'due_date' in data else None
        )
        db.session.add(task)
        db.session.flush()  # Flush to get the task_id

        # If this task is imported from a ticket, create task assignment and sync status/priority
        if 'ticket_id' in data:
            ticket = Ticket.query.get(data['ticket_id'])
            if ticket:
                # Map ticket status to task status
                task_status = 'completed' if ticket.status == 'completed' else \
                            'in progress' if ticket.status == 'in progress' else \
                            'pending'
                task.status = task_status
                task.priority = ticket.priority  # Sync priority with ticket

                task_assignment = TaskAssignment(
                    task_id=task.task_id,
                    ticket_id=data['ticket_id'],
                    assigned_to_user_id=data.get('assigned_to_id'),
                    status=task_status
                )
                db.session.add(task_assignment)

        db.session.commit()

        # Send email notification if user is assigned
        notifications_sent = False
        if data.get('assigned_to_id'):
            try:
                assigned_user = User.query.get(data['assigned_to_id'])
                property = Property.query.get(data['property_id'])
                if assigned_user and property:
                    email_service = EmailService()
                    notifications_sent = email_service.send_task_assignment_notification(
                        assigned_user, task, property.name
                    )
            except Exception as e:
                app.logger.error(f"Failed to send email notification: {str(e)}")

        return jsonify({
            'msg': 'Task created successfully',
            'task': task.to_dict(),
            'notifications_sent': notifications_sent
        }), 201

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating task: {str(e)}")
        return jsonify({'msg': f'Error creating task: {str(e)}'}), 500

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

@app.route('/users/<int:user_id>', methods=['GET', 'PUT', 'PATCH', 'DELETE'])
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

        elif request.method in ['PUT', 'PATCH']:
            data = request.get_json()
            changes = []  # Track all changes for notification
            
            # Store old values for comparison
            old_role = target_user.role
            old_group = target_user.group
            old_status = target_user.is_active
            old_phone = target_user.phone
            old_properties = set(p.property_id for p in target_user.assigned_properties)
            
            # Handle property assignments
            if 'assigned_properties' in data:
                # Clear existing property assignments
                UserProperty.query.filter_by(user_id=user_id).delete()
                
                # Add new property assignments
                for property_id in data['assigned_properties']:
                    user_property = UserProperty(user_id=user_id, property_id=property_id)
                    db.session.add(user_property)
                
                # Track property changes
                new_properties = set(data['assigned_properties'])
                added_properties = new_properties - old_properties
                removed_properties = old_properties - new_properties
                
                if added_properties:
                    added_names = [Property.query.get(pid).name for pid in added_properties if Property.query.get(pid)]
                    changes.append(f"Added to properties: {', '.join(added_names)}")
                if removed_properties:
                    removed_names = [Property.query.get(pid).name for pid in removed_properties if Property.query.get(pid)]
                    changes.append(f"Removed from properties: {', '.join(removed_names)}")
            
            # Update other fields
            if 'email' in data:
                target_user.email = data['email']
                changes.append(f"Email updated to: {data['email']}")
            
            if 'phone' in data:
                target_user.phone = data['phone']
                changes.append(f"Phone updated to: {data['phone']}")
            
            if 'is_active' in data:
                target_user.is_active = data['is_active']
                changes.append(f"Account {data['is_active'] and 'activated' or 'deactivated'}")
            
            if 'role' in data and current_user.role == 'super_admin':
                target_user.role = data['role']
                changes.append(f"Role changed from {old_role} to {data['role']}")
            
            if 'group' in data:
                target_user.group = data['group']
                changes.append(f"Group changed from {old_group or 'None'} to {data['group']}")
            
            db.session.commit()

            # Send notifications based on changes
            try:
                email_service = EmailService()
                admin_emails = [user.email for user in User.query.filter_by(role='super_admin').all()]
                
                # Determine notification type based on changes
                if 'role' in data:
                    notification_type = 'role_change'
                elif 'group' in data:
                    notification_type = 'group_change'
                elif 'assigned_properties' in data:
                    notification_type = 'property_assignment'
                elif 'is_active' in data:
                    notification_type = 'activation' if data['is_active'] else 'deactivation'
                else:
                    notification_type = 'update'
                
                email_service.send_user_management_notification(
                    user=target_user,
                    changes=changes,
                    updated_by=current_user.username,
                    admin_emails=admin_emails,
                    change_type=notification_type
                )
            except Exception as e:
                app.logger.error(f"Failed to send notification email: {str(e)}")
                # Continue with the update even if email fails
            
            return jsonify({'msg': 'User updated successfully', 'changes': changes})

        elif request.method == 'DELETE':
            if current_user.role != 'super_admin':
                return jsonify({'msg': 'Unauthorized'}), 403
            
            # Send deletion notification
            try:
                email_service = EmailService()
                admin_emails = [user.email for user in User.query.filter_by(role='super_admin').all()]
                
                changes = ["Account scheduled for deletion"]
                email_service.send_user_management_notification(
                    user=target_user,
                    changes=changes,
                    updated_by=current_user.username,
                    admin_emails=admin_emails,
                    change_type="deleted"
                )
            except Exception as e:
                app.logger.error(f"Failed to send deletion notification email: {str(e)}")
            
            db.session.delete(target_user)
            db.session.commit()
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
            properties = Property.query.filter(Property.managers.any(user_id=current_user_id)).all()
        else:
            properties = current_user.assigned_properties

        return jsonify({
            'properties': [{
                'property_id': p.property_id,
                'name': p.name,
                'address': p.address,
                'type': p.type,
                'status': p.status,
                'managers': [{'user_id': m.user_id, 'username': m.username} for m in p.managers]
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
            status=data.get('status', 'active')
        )
        db.session.add(new_property)
        db.session.commit()
        return jsonify({'message': 'Property created successfully', 'property_id': new_property.property_id}), 201

@app.route('/properties/<int:property_id>', methods=['GET', 'PUT', 'DELETE', 'PATCH'])
@jwt_required()
def manage_property(property_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'message': 'User not found'}), 404

        property = Property.query.get_or_404(property_id)

        if request.method == 'GET':
            return jsonify(property.to_dict())

        # Check authorization for PUT and DELETE
        if current_user.role not in ['super_admin', 'manager']:
            return jsonify({'message': 'Unauthorized - Only super admins and managers can modify properties'}), 403
            
        # For managers, verify they manage this property
        if current_user.role == 'manager' and not any(m.user_id == current_user.user_id for m in property.managers):
            return jsonify({'message': 'Unauthorized - You can only modify properties you manage'}), 403

        if request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'message': 'No data provided'}), 400

            # Update allowed fields
            allowed_fields = ['name', 'address', 'type', 'status', 'description']
            for field in allowed_fields:
                if field in data:
                    setattr(property, field, data[field])

            try:
                db.session.commit()
                return jsonify({'message': 'Property updated successfully', 'property': property.to_dict()})
            except Exception as e:
                db.session.rollback()
                app.logger.error(f"Error updating property: {str(e)}")
                return jsonify({'message': f'Error updating property: {str(e)}'}), 500

        elif request.method == 'DELETE':
            try:
                db.session.delete(property)
                db.session.commit()
                return jsonify({'message': 'Property deleted successfully'})
            except Exception as e:
                db.session.rollback()
                app.logger.error(f"Error deleting property: {str(e)}")
                return jsonify({'message': f'Error deleting property: {str(e)}'}), 500

        elif request.method == 'PATCH':
            data = request.get_json()
            old_status = property.status

            # Update property fields
            for field in ['name', 'address', 'status', 'description']:
                if field in data:
                    setattr(property, field, data[field])

            db.session.commit()

            # Send notifications if status was changed
            if 'status' in data and old_status != property.status:
                # Get all managers for this property
                property_managers = User.query.join(PropertyManager).filter(
                    PropertyManager.property_id == property.property_id
                ).all()
                
                super_admins = User.query.filter_by(role='super_admin').all()
                
                # Combine unique recipients
                recipients = list(set(property_managers + super_admins))

                # Send email notifications
                email_service = EmailService()
                email_service.send_property_status_notification(
                    property=property,
                    old_status=old_status,
                    new_status=property.status,
                    recipients=recipients
                )

            return jsonify({
                "msg": "Property updated successfully",
                "property": property.to_dict()
            }), 200

    except Exception as e:
        app.logger.error(f"Error in manage_property: {str(e)}")
        return jsonify({'message': f'Internal server error: {str(e)}'}), 500

@app.route('/rooms', methods=['GET', 'POST'])
@jwt_required()
def rooms():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if request.method == 'GET':
        if current_user.role == 'super_admin':
            rooms = Room.query.all()
        elif current_user.role == 'manager':
            rooms = Room.query.join(Property).filter(Property.managers.any(user_id=current_user_id)).all()
        else:
            rooms = Room.query.filter(Room.property_id.in_([p.property_id for p in current_user.assigned_properties])).all()

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
        # Check if room has any associated tickets
        tickets = Ticket.query.filter_by(room_id=room_id).first()
        if tickets:
            app.logger.warning(f"Cannot delete room {room_id} as it has associated tickets")
            return jsonify({"msg": "Cannot delete room that has associated tickets. Please reassign or resolve all tickets first."}), 400

        db.session.delete(room)
        db.session.commit()
        app.logger.info(f"Room {room_id} deleted successfully")
        return jsonify({"msg": "Room deleted successfully"})

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
        'managers': [{'user_id': m.user_id, 'username': m.username} for m in prop.managers]
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
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'message': 'User not found'}), 404

        if current_user.role not in ['super_admin', 'manager']:
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json()
        user_id = data.get('user_id')
        property_ids = data.get('property_ids', [])
        is_manager_assignment = data.get('is_manager_assignment', False)

        user = User.query.get(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # For manager assignments, verify the assigner has permission
        if is_manager_assignment and current_user.role != 'super_admin':
            return jsonify({'message': 'Only super admins can assign manager properties'}), 403

        # Clear existing property assignments based on type
        if is_manager_assignment:
            PropertyManager.query.filter_by(user_id=user_id).delete()
        else:
            UserProperty.query.filter_by(user_id=user_id).delete()

        # Add new property assignments
        for property_id in property_ids:
            property = Property.query.get(property_id)
            if property:
                if is_manager_assignment:
                    manager_assignment = PropertyManager(user_id=user_id, property_id=property_id)
                    db.session.add(manager_assignment)
                else:
                    user_property = UserProperty(user_id=user_id, property_id=property_id)
                    db.session.add(user_property)

        try:
            db.session.commit()
            return jsonify({
                'message': f"{'Manager' if is_manager_assignment else 'User'} property assignments updated successfully",
                'user': user.to_dict()
            })
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error updating property assignments: {str(e)}")
            return jsonify({'message': f'Error updating property assignments: {str(e)}'}), 500

    except Exception as e:
        app.logger.error(f"Error in assign_property: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

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

    managed_properties = Property.query.filter(Property.managers.any(user_id=user_id)).all()

    return jsonify({
        'properties': [{'property_id': p.property_id, 'name': p.name} for p in managed_properties]
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
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'message': 'User not found'}), 404

        property = Property.query.get(property_id)
        if not property:
            return jsonify({'message': 'Property not found'}), 404

        # Get all users assigned to this property
        assigned_users = User.query.join(UserProperty).filter(
            UserProperty.property_id == property_id
        ).all()

        # Get the property managers
        managers = property.managers
        
        # Combine managers and assigned users, avoiding duplicates
        all_users = []
        for manager in managers:
            all_users.append({
                'user_id': manager.user_id,
                'username': manager.username,
                'role': manager.role,
                'email': manager.email,
                'group': manager.group
            })

        for user in assigned_users:
            # Only add if not already in the list (avoid duplicate managers)
            if not any(u['user_id'] == user.user_id for u in all_users):
                all_users.append({
                    'user_id': user.user_id,
                    'username': user.username,
                    'role': user.role,
                    'email': user.email,
                    'group': user.group
                })

        return jsonify({'users': all_users}), 200

    except Exception as e:
        app.logger.error(f"Error in get_property_users: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/properties/<int:property_id>/tickets', methods=['GET'])
@jwt_required()
def get_property_tickets(property_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        # Verify access to property
        if current_user.role == 'user':
            has_access = any(p.property_id == property_id for p in current_user.assigned_properties)
            if not has_access:
                return jsonify({'msg': 'Unauthorized access to property'}), 403
        elif current_user.role == 'manager':
            has_access = any(p.property_id == property_id for p in current_user.managed_properties)
            if not has_access:
                return jsonify({'msg': 'Unauthorized access to property'}), 403

        # Get tickets for the property
        tickets = Ticket.query.filter_by(property_id=property_id).all()
        
        # For regular users, filter tickets based on their group
        if current_user.role == 'user':
            # Filter tickets based on user's group
            tickets = [ticket for ticket in tickets if 
                      ticket.category == current_user.group or  # Show tickets in user's group
                      ticket.user_id == current_user.user_id]   # Also show tickets created by the user
        
        ticket_list = []
        for ticket in tickets:
            creator = User.query.get(ticket.user_id)
            room = Room.query.get(ticket.room_id) if ticket.room_id else None
            
            ticket_list.append({
                'ticket_id': ticket.ticket_id,
                'title': ticket.title,
                'description': ticket.description,
                'status': ticket.status,
                'priority': ticket.priority,
                'category': ticket.category,
                'subcategory': ticket.subcategory,  # Add subcategory to response
                'room_id': ticket.room_id,
                'room_name': room.name if room else None,
                'created_by_id': ticket.user_id,
                'created_by_username': creator.username if creator else 'Unknown',
                'created_by_group': creator.group if creator else 'Unknown',
                'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
                'property_id': ticket.property_id
            })

        return jsonify({'tickets': ticket_list}), 200

    except Exception as e:
        app.logger.error(f"Error in get_property_tickets: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

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

@app.route('/users/<int:user_id>/admin-change-password', methods=['POST'])
@jwt_required()
@handle_errors
def admin_change_password(user_id):
    current_user = get_user_from_jwt()
    if not current_user or current_user.role != 'super_admin':
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.json
    if not data or 'new_password' not in data:
        return jsonify({'message': 'New password is required'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    user.set_password(data['new_password'])
    db.session.commit()
    
    # Send email if requested
    if data.get('send_email', True):
        email_service = EmailService()
        email_sent = email_service.send_user_registration_email(user, data['new_password'], current_user)
        if not email_sent:
            app.logger.error(f"Failed to send password change email to user {user.username}")
            return jsonify({'message': 'Password updated but failed to send email'}), 200
    
    return jsonify({'message': 'Password updated successfully'}), 200

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

        # Base query filters for tickets
        ticket_filters = []
        if property_id:
            ticket_filters.append(Ticket.property_id == property_id)

        # Base query filters for tasks
        task_filters = []
        if property_id:
            task_filters.append(Task.property_id == property_id)

        # Role-based filtering
        if current_user['role'] == 'user':
            # For users: show tickets they created or are assigned to
            ticket_filters.append(
                or_(
                    Ticket.user_id == current_user['user_id'],
                    Task.assigned_to_id == current_user['user_id']
                )
            )
            task_filters.append(Task.assigned_to_id == current_user['user_id'])
        elif current_user['role'] == 'manager':
            # For managers: show tickets and tasks for their managed properties
            managed_properties = PropertyManager.query.filter_by(
                user_id=current_user['user_id']
            ).with_entities(PropertyManager.property_id).all()
            managed_property_ids = [p[0] for p in managed_properties]
            ticket_filters.append(Ticket.property_id.in_(managed_property_ids))
            task_filters.append(Task.property_id.in_(managed_property_ids))

        # Get tickets with filters
        tickets = Ticket.query.filter(*ticket_filters).all()
        
        # Get tasks with filters
        tasks = Task.query.filter(*task_filters).all()

        # Calculate total properties based on role
        if current_user['role'] == 'super_admin':
            total_properties = Property.query.filter_by(status='active').count()
            total_users = User.query.filter_by(is_active=True).count()
        elif current_user['role'] == 'manager':
            total_properties = len(managed_property_ids)
            total_users = User.query.filter(
                User.manager_id == current_user['user_id'],
                User.is_active == True
            ).count()
        else:
            total_properties = len(set(t.property_id for t in tickets))
            total_users = 0

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

        # Get total rooms based on role
        if current_user['role'] == 'super_admin':
            total_rooms = Room.query.count()
        elif current_user['role'] == 'manager':
            total_rooms = Room.query.filter(
                Room.property_id.in_(managed_property_ids)
            ).count()
        else:
            # For regular users, count rooms in properties they have tickets/tasks in
            property_ids = set(t.property_id for t in tickets).union(set(t.property_id for t in tasks))
            total_rooms = Room.query.filter(Room.property_id.in_(property_ids)).count()

        return jsonify({
            'openTickets': status_counts.get('Open', 0),
            'activeTasks': active_tasks,
            'completedTasks': completed_tasks,
            'totalTasks': total_tasks,
            'resolutionRate': round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2),
            'avgResponseTime': round(sum(resolution_times) / len(resolution_times) if resolution_times else 0, 2),
            'totalProperties': total_properties,
            'totalUsers': total_users,
            'totalRooms': total_rooms,
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

# Email System Settings Routes
@app.route('/api/settings/system', methods=['GET'])
@jwt_required()
def get_system_settings():
    """Get system email settings"""
    try:
        # Get the current user
        current_user = get_user_from_jwt()
        if not current_user or current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized - Only super admins can view system settings'}), 403

        settings = EmailSettings.query.first()
        if not settings:
            return jsonify({
                'smtp_server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
                'smtp_port': int(os.getenv('SMTP_PORT', '587')),
                'smtp_username': os.getenv('SMTP_USERNAME', 'modernmanagementhotels@gmail.com'),
                'smtp_password': '',
                'sender_email': os.getenv('SENDER_EMAIL', 'modernmanagementhotels@gmail.com'),
                'enable_email_notifications': True
            })

        return jsonify(settings.to_dict())

    except Exception as e:
        app.logger.error(f"Error in get_system_settings: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/settings/system', methods=['POST'])
@jwt_required()
def update_system_settings():
    """Update system email settings"""
    try:
        # Get the current user
        current_user = get_user_from_jwt()
        if not current_user or current_user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized - Only super admins can update system settings'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        settings = EmailSettings.query.first()
        if not settings:
            settings = EmailSettings()
            db.session.add(settings)

        # Update settings
        settings.smtp_server = data.get('smtp_server', settings.smtp_server)
        settings.smtp_port = data.get('smtp_port', settings.smtp_port)
        settings.smtp_username = data.get('smtp_username', settings.smtp_username)
        if data.get('smtp_password'):  # Only update password if provided
            settings.smtp_password = data.get('smtp_password')
        settings.sender_email = data.get('sender_email', settings.sender_email)
        settings.enable_email_notifications = data.get('enable_email_notifications', settings.enable_email_notifications)

        db.session.commit()

        # Return updated settings
        return jsonify(settings.to_dict())

    except Exception as e:
        app.logger.error(f"Error in update_system_settings: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/tickets/<int:ticket_id>', methods=['DELETE'])
@jwt_required()
def delete_ticket(ticket_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        ticket = Ticket.query.get_or_404(ticket_id)

        # Check if user has permission to delete the ticket
        if current_user.role == 'user' and ticket.user_id != current_user.user_id:
            return jsonify({"msg": "Unauthorized - You can only delete your own tickets"}), 403
        elif current_user.role == 'manager':
            # Managers can only delete tickets from their properties
            has_access = any(p.property_id == ticket.property_id for p in current_user.managed_properties)
            if not has_access:
                return jsonify({"msg": "Unauthorized - You can only delete tickets from your managed properties"}), 403

        # Delete associated task assignments first
        TaskAssignment.query.filter_by(ticket_id=ticket_id).delete()
        
        # Delete the ticket
        db.session.delete(ticket)
        db.session.commit()
        
        app.logger.info(f"Ticket {ticket_id} deleted successfully by user {current_user.username}")
        return jsonify({"msg": "Ticket deleted successfully"})

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting ticket: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/properties/<int:property_id>/managers', methods=['GET'])
@jwt_required()
def get_property_managers(property_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        property = Property.query.get_or_404(property_id)
        if not property:
            return jsonify({"msg": "Property not found"}), 404

        # Get all managers for this property
        managers = property.managers.all()

        return jsonify({
            'managers': [{
                'user_id': manager.user_id,
                'username': manager.username,
                'email': manager.email,
                'role': manager.role,
                'group': manager.group
            } for manager in managers]
        }), 200

    except Exception as e:
        app.logger.error(f"Error in get_property_managers: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/tickets/<int:ticket_id>', methods=['GET', 'PATCH', 'DELETE'])
@jwt_required()
def manage_ticket(ticket_id):
    try:
        ticket = Ticket.query.get(ticket_id)
        if not ticket:
            return jsonify({'msg': 'Ticket not found'}), 404

        if request.method == 'GET':
            return jsonify(ticket.to_dict()), 200

        elif request.method == 'PATCH':
            data = request.get_json()
            changes = []  # Track changes for notification

            # Update basic fields if provided
            for field in ['title', 'description', 'category', 'subcategory']:
                if field in data:
                    old_value = getattr(ticket, field)
                    new_value = data[field]
                    if old_value != new_value:
                        setattr(ticket, field, new_value)
                        changes.append(f"{field.title()}: {old_value} → {new_value}")

            # Handle status and priority updates with task synchronization
            if 'status' in data:
                old_status = ticket.status
                new_status = data['status']
                if old_status != new_status:
                    ticket.status = new_status
                    changes.append(f"Status: {old_status} → {new_status}")
                    
                    # Update associated task status
                    task_assignment = TaskAssignment.query.filter_by(ticket_id=ticket_id).first()
                    if task_assignment:
                        task = Task.query.get(task_assignment.task_id)
                        if task:
                            # Map ticket status to task status
                            if new_status == 'completed':
                                task.status = 'completed'
                            elif new_status == 'in progress':
                                task.status = 'in progress'
                            elif new_status == 'open':
                                task.status = 'pending'
                            task_assignment.status = task.status

            if 'priority' in data:
                old_priority = ticket.priority
                new_priority = data['priority']
                if old_priority != new_priority:
                    ticket.priority = new_priority
                    changes.append(f"Priority: {old_priority} → {new_priority}")
                    
                    # Update associated task priority
                    task_assignment = TaskAssignment.query.filter_by(ticket_id=ticket_id).first()
                    if task_assignment:
                        task = Task.query.get(task_assignment.task_id)
                        if task:
                            task.priority = new_priority

            # Handle room_id update
            if 'room_id' in data:
                old_room = Room.query.get(ticket.room_id) if ticket.room_id else None
                new_room = Room.query.get(data['room_id']) if data['room_id'] else None

                if old_room != new_room:
                    # Update old room status if exists
                    if old_room:
                        old_room.status = 'Available'
                    
                    # Update new room status if exists
                    if new_room:
                        if ticket.category == 'Maintenance':
                            new_room.status = 'Maintenance'
                        elif ticket.category == 'Housekeeping':
                            new_room.status = 'Cleaning'
                        else:
                            new_room.status = 'Out of Order'
                    
                    ticket.room_id = data['room_id']
                    changes.append(f"Room: {old_room.name if old_room else 'None'} → {new_room.name if new_room else 'None'}")

            try:
                db.session.commit()

                # Send notifications if there are changes
                if changes:
                    # Get property managers and super admins
                    property_managers = User.query.join(PropertyManager).filter(
                        PropertyManager.property_id == ticket.property_id
                    ).all()
                    super_admins = User.query.filter_by(role='super_admin').all()
                    recipients = list(set(property_managers + super_admins))

                    # Get property name
                    property_name = Property.query.get(ticket.property_id).name

                    # Get current user for update attribution
                    current_user = get_user_from_jwt()
                    updated_by = f"{current_user.username} ({current_user.group})" if current_user else "Unknown"

                    # Send notification
                    from app.services.email_service import EmailService
                    email_service = EmailService()
                    email_service.send_ticket_notification(
                        ticket,
                        property_name,
                        recipients,
                        notification_type="update",
                        changes=changes,
                        updated_by=updated_by
                    )

                return jsonify({
                    'msg': 'Ticket updated successfully',
                    'ticket': ticket.to_dict(),
                    'changes': changes
                }), 200

            except Exception as e:
                db.session.rollback()
                app.logger.error(f"Error updating ticket: {str(e)}")
                return jsonify({'msg': 'Failed to update ticket'}), 500

        elif request.method == 'DELETE':
            try:
                # Get property managers and super admins before deleting
                property_managers = User.query.join(PropertyManager).filter(
                    PropertyManager.property_id == ticket.property_id
                ).all()
                super_admins = User.query.filter_by(role='super_admin').all()
                recipients = list(set(property_managers + super_admins))

                # Get property name
                property_name = Property.query.get(ticket.property_id).name

                # Store ticket info for notification
                ticket_info = ticket.to_dict()

                # Update room status if ticket was associated with a room
                if ticket.room_id:
                    room = Room.query.get(ticket.room_id)
                    if room:
                        room.status = 'Available'

                # Delete the ticket
                db.session.delete(ticket)
                db.session.commit()

                # Send deletion notification
                from app.services.email_service import EmailService
                email_service = EmailService()
                email_service.send_ticket_notification(
                    ticket_info,
                    property_name,
                    recipients,
                    notification_type="deleted"
                )

                return jsonify({'msg': 'Ticket deleted successfully'}), 200

            except Exception as e:
                db.session.rollback()
                app.logger.error(f"Error deleting ticket: {str(e)}")
                return jsonify({'msg': 'Failed to delete ticket'}), 500

    except Exception as e:
        app.logger.error(f"Error in manage_ticket: {str(e)}")
        return jsonify({'msg': 'Internal server error'}), 500

@app.route('/properties/<int:property_id>/rooms/upload', methods=['POST'])
@jwt_required()
def upload_rooms(property_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            app.logger.error("User not found from JWT")
            return jsonify({"msg": "User not found"}), 404

        # Add your upload logic here
        # For example, you can use Flask's file upload handling
        # to handle the file upload request
        file = request.files['file']
        if file.filename == '':
            return jsonify({"msg": "No file uploaded"}), 400

        # Save the file to a specific directory
        file_path = os.path.join('uploads', file.filename)
        file.save(file_path)

        return jsonify({"msg": "File uploaded successfully"}), 200

    except Exception as e:
        app.logger.error(f"Error uploading file: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/auth/reset-password', methods=['POST'])
@jwt_required()
def reset_password():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404

        data = request.get_json()
        if not data or 'user_id' not in data or 'new_password' not in data:
            return jsonify({"msg": "Missing required fields"}), 400

        # Only super_admin and managers can reset other users' passwords
        if current_user.role not in ['super_admin', 'manager'] and str(current_user.user_id) != str(data['user_id']):
            return jsonify({"msg": "Unauthorized"}), 403

        target_user = User.query.get(data['user_id'])
        if not target_user:
            return jsonify({"msg": "Target user not found"}), 404

        # Hash the new password
        target_user.password = generate_password_hash(data['new_password'])
        db.session.commit()

        # Send email notifications
        email_service = EmailService()
        
        # Notify the user whose password was reset
        email_service.send_password_reset_notification(
            user=target_user,
            reset_by=current_user,
            is_self_reset=(str(current_user.user_id) == str(data['user_id']))
        )

        # If reset by admin/manager, send admin alert
        if str(current_user.user_id) != str(data['user_id']):
            super_admins = User.query.filter_by(role='super_admin').all()
            admin_emails = [admin.email for admin in super_admins]
            if admin_emails:
                email_service.send_admin_alert(
                    subject="Password Reset Alert",
                    message=f"""
                        <p>A password reset was performed:</p>
                        <p><strong>User:</strong> {target_user.username}</p>
                        <p><strong>Reset By:</strong> {current_user.username}</p>
                        <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    """,
                    admin_emails=admin_emails
                )

        return jsonify({"msg": "Password reset successful"}), 200

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error resetting password: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/auth/request-reset', methods=['POST'])
def request_password_reset():
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({"msg": "Email is required"}), 400

        user = User.query.filter_by(email=data['email']).first()
        if not user:
            # Return success even if user not found to prevent email enumeration
            return jsonify({"msg": "If the email exists, a reset link will be sent"}), 200

        # Generate a reset token
        reset_token = generate_password_reset_token()
        user.reset_token = reset_token
        user.reset_token_expires = datetime.now() + timedelta(hours=1)
        db.session.commit()

        # Send reset email
        email_service = EmailService()
        email_service.send_password_reset_link(
            user=user,
            reset_token=reset_token
        )

        # Send admin alert
        super_admins = User.query.filter_by(role='super_admin').all()
        admin_emails = [admin.email for admin in super_admins]
        if admin_emails:
            email_service.send_admin_alert(
                subject="Password Reset Request",
                message=f"""
                    <p>A password reset was requested:</p>
                    <p><strong>User:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                """,
                admin_emails=admin_emails
            )

        return jsonify({"msg": "If the email exists, a reset link will be sent"}), 200

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error requesting password reset: {str(e)}")
        return jsonify({"msg": "Internal server error"}), 500

@app.route('/api/test-email', methods=['POST'])
@jwt_required()
def test_email():
    """Test the email service configuration and send a test email."""
    try:
        # Get the current user
        current_user = get_jwt_identity()
        user = User.query.get(current_user['user_id'])
        
        if not user or user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized - Only super admins can test email service'}), 403

        # Get test email recipient from request or use user's email
        data = request.get_json()
        test_email = data.get('email', user.email) if data else user.email

        # Initialize email test service
        email_test_service = EmailTestService()
        
        # Send test email
        result = email_test_service.send_test_email(test_email)
        return jsonify(result), 200

    except ValueError as e:
        app.logger.error(f"Configuration error in test_email endpoint: {str(e)}")
        return jsonify({
            'error': 'Email configuration error',
            'details': str(e)
        }), 400
    except Exception as e:
        app.logger.error(f"Error in test_email endpoint: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/test-all-emails', methods=['POST'])
@jwt_required()
def test_all_emails():
    """Run comprehensive tests on email service configuration."""
    try:
        # Get the current user
        current_user = get_jwt_identity()
        user = User.query.get(current_user['user_id'])
        
        if not user or user.role != 'super_admin':
            return jsonify({'error': 'Unauthorized - Only super admins can test email service'}), 403

        # Initialize email test service and run all tests
        email_test_service = EmailTestService()
        test_results = email_test_service.run_all_tests()
        
        return jsonify(test_results), 200

    except ValueError as e:
        app.logger.error(f"Configuration error in test_all_emails endpoint: {str(e)}")
        return jsonify({
            'error': 'Email configuration error',
            'details': str(e)
        }), 400
    except Exception as e:
        app.logger.error(f"Error in test_all_emails endpoint: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/service-requests', methods=['POST'])
@jwt_required()
def create_service_request():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'msg': 'User not found'}), 404

        data = request.get_json()
        required_fields = ['room_id', 'property_id', 'request_group', 'request_type', 'priority']
        
        # Validate required fields
        for field in required_fields:
            if not data.get(field):
                return jsonify({'msg': f'Missing required field: {field}'}), 400

        # Validate room exists and belongs to property
        room = Room.query.filter_by(
            room_id=data['room_id'],
            property_id=data['property_id']
        ).first()
        
        if not room:
            return jsonify({'msg': 'Invalid room_id or room does not belong to the property'}), 400

        # Create new service request
        new_request = ServiceRequest(
            room_id=data['room_id'],
            property_id=data['property_id'],
            request_group=data['request_group'],
            request_type=data['request_type'],
            priority=data['priority'],
            quantity=data.get('quantity', 1),
            guest_name=data.get('guest_name'),
            notes=data.get('notes'),
            created_by_id=current_user.user_id
        )
        
        db.session.add(new_request)
        db.session.flush()  # Get the request ID

        # Create a task for the request
        task = Task(
            title=f"{data['request_group']} Request: {data['request_type']} - Room {room.name}",
            description=f"Priority: {data['priority']}\nGuest: {data.get('guest_name', 'N/A')}\nNotes: {data.get('notes', 'N/A')}",
            status='pending',
            priority=data['priority'],
            property_id=data['property_id']
        )
        
        db.session.add(task)
        db.session.flush()  # Get the task ID
        
        # Link task to request
        new_request.assigned_task_id = task.task_id
        
        # Find all staff members in the request group
        staff_members = User.query.filter_by(
            group=data['request_group'],
            is_active=True
        ).join(PropertyManager).filter(
            PropertyManager.property_id == data['property_id']
        ).all()

        if staff_members:
            # Create task assignments for all staff members using request_id as ticket_id
            for staff in staff_members:
                task_assignment = TaskAssignment(
                    task_id=task.task_id,
                    ticket_id=new_request.request_id,  # Use request_id as ticket_id
                    assigned_to_user_id=staff.user_id,
                    status='Pending'
                )
                db.session.add(task_assignment)

                # Send SMS notification if staff has phone number
                if staff.phone:
                    sms_service = SMSService()
                    sms_service.send_housekeeping_request_notification(
                        room.name,
                        f"{data['request_group']} - {data['request_type']}",
                        staff.phone
                    )

        try:
            db.session.commit()

            return jsonify({
                'msg': 'Service request created successfully',
                'request': new_request.to_dict()
            }), 201

        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error creating service request: {str(e)}")
            return jsonify({'msg': 'Failed to create service request'}), 500

    except Exception as e:
        app.logger.error(f"Error in create_service_request: {str(e)}")
        return jsonify({'msg': 'Internal server error'}), 500

@app.route('/service-requests', methods=['GET'])
@jwt_required()
def get_service_requests():
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'msg': 'User not found'}), 404

        property_id = request.args.get('property_id', type=int)
        status = request.args.get('status')
        request_group = request.args.get('request_group')
        
        # Base query
        query = ServiceRequest.query

        # Apply filters
        if property_id:
            query = query.filter_by(property_id=property_id)
        if status:
            query = query.filter_by(status=status)
        if request_group:
            query = query.filter_by(request_group=request_group)

        # Filter based on user role/group
        if current_user.role == 'user':
            # Users see requests for their group and property
            query = query.filter(
                (ServiceRequest.request_group == current_user.group) &
                (ServiceRequest.property_id.in_([p.property_id for p in current_user.assigned_properties]))
            )
        elif current_user.role == 'manager':
            # Managers see requests for their managed properties
            managed_properties = PropertyManager.query.filter_by(
                user_id=current_user.user_id
            ).with_entities(PropertyManager.property_id).all()
            managed_property_ids = [p[0] for p in managed_properties]
            query = query.filter(ServiceRequest.property_id.in_(managed_property_ids))

        # Execute query
        requests = query.order_by(ServiceRequest.created_at.desc()).all()
        
        return jsonify({
            'requests': [request.to_dict() for request in requests]
        }), 200

    except Exception as e:
        app.logger.error(f"Error getting service requests: {str(e)}")
        return jsonify({'msg': 'Failed to get service requests'}), 500

@app.route('/service-requests/<int:request_id>', methods=['PATCH'])
@jwt_required()
def update_service_request(request_id):
    try:
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({'msg': 'User not found'}), 404

        service_request = ServiceRequest.query.get_or_404(request_id)
        data = request.get_json()

        # Update status if provided
        if 'status' in data:
            old_status = service_request.status
            service_request.status = data['status']

            # If marked as completed
            if data['status'] == 'completed' and old_status != 'completed':
                service_request.completed_at = datetime.utcnow()
                
                # Update associated task
                if service_request.assigned_task:
                    service_request.assigned_task.status = 'completed'
                    # Update all task assignments
                    for assignment in TaskAssignment.query.filter_by(task_id=service_request.assigned_task_id).all():
                        assignment.status = 'Completed'

                    # Send SMS notification to staff members
                    staff_members = User.query.filter_by(
                        group=service_request.request_group,
                        is_active=True
                    ).join(PropertyManager).filter(
                        PropertyManager.property_id == service_request.property_id
                    ).all()

                    if staff_members:
                        sms_service = SMSService()
                        for staff in staff_members:
                            if staff.phone:  # Only send if staff has phone number
                                sms_service.send_housekeeping_request_notification(
                                    service_request.room.name,
                                    f"Request completed: {service_request.request_type}",
                                    staff.phone
                                )

        # Update other fields if provided
        for field in ['notes', 'quantity', 'priority']:
            if field in data:
                setattr(service_request, field, data[field])

        db.session.commit()
        return jsonify({
            'msg': 'Service request updated successfully',
            'request': service_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating service request: {str(e)}")
        return jsonify({'msg': 'Failed to update service request'}), 500

# Add this route with the existing routes
@app.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    try:
        # Get current user
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404
            
        # Only super_admin and managers can create users
        if current_user.role not in ['super_admin', 'manager']:
            return jsonify({"msg": "Unauthorized - Insufficient permissions"}), 403
            
        # Get and validate input data
        data = request.get_json()
        if not data:
            return jsonify({"msg": "No input data provided"}), 400
            
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'role']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({"msg": f"Missing required fields: {', '.join(missing_fields)}"}), 400

        # Check if username or email already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"msg": "Username already exists"}), 400
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"msg": "Email already exists"}), 400

        # Create new user with only the fields that exist in the model
        new_user = User(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            role=data['role'],
            group=data.get('group'),
            phone=data.get('phone')
        )
        
        # Set is_active separately if the field exists in the model
        if hasattr(new_user, 'is_active'):
            new_user.is_active = data.get('is_active', True)
        
        db.session.add(new_user)
        db.session.flush()  # Flush to get the user_id

        # Handle property assignments
        if 'property_ids' in data and data['property_ids']:
            for property_id in data['property_ids']:
                # Create UserProperty relationship
                user_property = UserProperty(
                    user_id=new_user.user_id,
                    property_id=property_id
                )
                db.session.add(user_property)

                # If user is a manager, also create PropertyManager relationship
                if data['role'] == 'manager':
                    property_manager = PropertyManager(
                        user_id=new_user.user_id,
                        property_id=property_id
                    )
                    db.session.add(property_manager)

        db.session.commit()

        # Send welcome email
        try:
            email_service = EmailService()
            email_service.send_welcome_email(
                new_user,
                password=data['password'],
                sender=current_user.username
            )
        except Exception as e:
            app.logger.error(f"Failed to send welcome email: {str(e)}")
            # Continue even if email fails

        return jsonify({
            "msg": "User created successfully",
            "user": new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating user: {str(e)}")
        return jsonify({"msg": f"Error creating user: {str(e)}"}), 500

@app.route('/users/<int:user_id>', methods=['PATCH'])
@jwt_required()
def update_user(user_id):
    try:
        # Get current user
        current_user = get_user_from_jwt()
        if not current_user:
            return jsonify({"msg": "User not found"}), 404
            
        # Only super_admin and managers can update users
        if current_user.role not in ['super_admin', 'manager']:
            return jsonify({"msg": "Unauthorized - Insufficient permissions"}), 403

        # Get user to update
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"msg": "No input data provided"}), 400

        # Handle role change
        if 'role' in data and data['role'] != user.role:
            old_role = user.role
            new_role = data['role']
            
            # If changing to manager
            if new_role == 'manager':
                # Get all current user properties
                user_properties = UserProperty.query.filter_by(user_id=user.user_id).all()
                
                # Add PropertyManager entries for all properties the user has access to
                for up in user_properties:
                    # Check if PropertyManager entry already exists
                    existing_manager = PropertyManager.query.filter_by(
                        user_id=user.user_id,
                        property_id=up.property_id
                    ).first()
                    
                    # If not exists, create it
                    if not existing_manager:
                        property_manager = PropertyManager(
                            user_id=user.user_id,
                            property_id=up.property_id
                        )
                        db.session.add(property_manager)
            
            # If changing from manager
            elif old_role == 'manager':
                # Just remove from property_managers but keep user_properties
                PropertyManager.query.filter_by(user_id=user.user_id).delete()
            
            user.role = new_role

        # Update other fields
        if 'username' in data:
            user.username = data['username']
        if 'email' in data:
            user.email = data['email']
        if 'group' in data:
            user.group = data['group']
        if 'phone' in data:
            user.phone = data['phone']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'password' in data:
            user.set_password(data['password'])

        # Handle property assignments
        if 'property_ids' in data:
            # Store old property assignments before deletion if user is a manager
            old_property_ids = None
            if user.role == 'manager':
                old_property_ids = [p.property_id for p in user.assigned_properties]

            # Remove all current property assignments
            UserProperty.query.filter_by(user_id=user.user_id).delete()
            if user.role == 'manager':
                PropertyManager.query.filter_by(user_id=user.user_id).delete()
            
            # Add new property assignments
            for property_id in data['property_ids']:
                # Add UserProperty for all users
                user_property = UserProperty(
                    user_id=user.user_id,
                    property_id=property_id
                )
                db.session.add(user_property)
                
                # Add PropertyManager only for managers
                if user.role == 'manager':
                    property_manager = PropertyManager(
                        user_id=user.user_id,
                        property_id=property_id
                    )
                    db.session.add(property_manager)

        db.session.commit()
        return jsonify({
            "msg": "User updated successfully",
            "user": user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating user: {str(e)}")
        return jsonify({"msg": f"Error updating user: {str(e)}"}), 500

@app.route('/users/<int:user_id>/verify-properties', methods=['GET'])
@jwt_required()
def verify_user_properties(user_id):
    """Debug endpoint to verify user property assignments"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404

        # Get all property assignments
        user_properties = UserProperty.query.filter_by(user_id=user.user_id).all()
        manager_properties = PropertyManager.query.filter_by(user_id=user.user_id).all()

        return jsonify({
            "user": {
                "user_id": user.user_id,
                "username": user.username,
                "role": user.role
            },
            "user_properties": [
                {
                    "property_id": up.property_id,
                    "property_name": Property.query.get(up.property_id).name
                } for up in user_properties
            ],
            "manager_properties": [
                {
                    "property_id": mp.property_id,
                    "property_name": Property.query.get(mp.property_id).name
                } for mp in manager_properties
            ] if user.role == 'manager' else []
        }), 200

    except Exception as e:
        app.logger.error(f"Error verifying user properties: {str(e)}")
        return jsonify({"msg": f"Error verifying user properties: {str(e)}"}), 500

@app.route('/fix-manager-properties', methods=['POST'])
@jwt_required()
def fix_manager_properties():
    """Fix property manager relationships for all managers"""
    try:
        # Get current user
        current_user = get_user_from_jwt()
        if not current_user or current_user.role != 'super_admin':
            return jsonify({"msg": "Unauthorized - Super admin required"}), 403

        # Get all managers
        managers = User.query.filter_by(role='manager').all()
        fixed_count = 0

        for manager in managers:
            # Get all user properties for this manager
            user_properties = UserProperty.query.filter_by(user_id=manager.user_id).all()
            
            for up in user_properties:
                # Check if PropertyManager entry exists
                existing_manager = PropertyManager.query.filter_by(
                    user_id=manager.user_id,
                    property_id=up.property_id
                ).first()
                
                # If not exists, create it
                if not existing_manager:
                    property_manager = PropertyManager(
                        user_id=manager.user_id,
                        property_id=up.property_id
                    )
                    db.session.add(property_manager)
                    fixed_count += 1

        db.session.commit()

        return jsonify({
            "msg": f"Fixed property manager relationships. Added {fixed_count} missing entries.",
            "details": {
                "total_managers": len(managers),
                "managers_fixed": fixed_count
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error fixing manager properties: {str(e)}")
        return jsonify({"msg": f"Error fixing manager properties: {str(e)}"}), 500