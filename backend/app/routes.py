from flask import request, jsonify
from app import app, db
from app.models import User, Ticket
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
