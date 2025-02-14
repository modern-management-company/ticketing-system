from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, get_jwt_identity, jwt_required
from flask_cors import CORS
from config import Config
from datetime import timedelta
import os
import logging
from logging.handlers import RotatingFileHandler
import json

# Configure logging
def setup_logging(app):
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.mkdir('logs')

    # Set up file handler
    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    # Set up console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    console_handler.setLevel(logging.INFO)
    app.logger.addHandler(console_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info('Ticketing System startup')

app = Flask(__name__)
app.config.from_object(Config)

# Set up logging
setup_logging(app)

# Configure CORS with more permissive settings for development
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "https://modernhotels.management"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 600
    }
})

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Configure JWT settings
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['JWT_ERROR_MESSAGE_KEY'] = 'message'
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
app.config['JWT_IDENTITY_CLAIM'] = 'identity'
app.config['JWT_BLACKLIST_ENABLED'] = False

jwt = JWTManager(app)

# JWT error handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    app.logger.warning(f"Expired token attempt: {jwt_payload}")
    return jsonify({
        'msg': 'The token has expired',
        'error': 'token_expired'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    app.logger.warning(f"Invalid token attempt: {error}")
    return jsonify({
        'msg': 'Signature verification failed',
        'error': 'invalid_token'
    }), 422

@jwt.unauthorized_loader
def missing_token_callback(error):
    app.logger.warning(f"Missing token: {error}")
    return jsonify({
        'msg': 'Request does not contain an access token',
        'error': 'authorization_required'
    }), 401

@jwt.needs_fresh_token_loader
def token_not_fresh_callback(jwt_header, jwt_payload):
    app.logger.warning(f"Non-fresh token used: {jwt_payload}")
    return jsonify({
        'msg': 'Fresh token required',
        'error': 'fresh_token_required'
    }), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    app.logger.warning(f"Revoked token attempt: {jwt_payload}")
    return jsonify({
        'msg': 'The token has been revoked',
        'error': 'token_revoked'
    }), 401

# Request logging middleware
@app.before_request
def log_request_info():
    app.logger.info('Request Headers: %s', dict(request.headers))
    app.logger.info('Request URL: %s %s', request.method, request.url)
    if request.get_json(silent=True):
        app.logger.info('Request Body: %s', json.dumps(request.get_json()))
    app.logger.info('Request Args: %s', dict(request.args))

@app.after_request
def log_response_info(response):
    app.logger.info('Response Status: %s', response.status)
    app.logger.info('Response Headers: %s', dict(response.headers))
    return response

# Import routes and models after initializing extensions
from app import routes, models

# Create database tables
with app.app_context():
    db.create_all()
    app.logger.info('Database tables created')