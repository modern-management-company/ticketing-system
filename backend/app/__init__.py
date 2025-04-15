import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_cors import CORS
from config import config
import logging
from logging.handlers import RotatingFileHandler
from flask_jwt_extended import get_jwt_identity, jwt_required
from config import Config
from datetime import timedelta
import json
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz
from app.extensions import db, migrate
from app.scheduler import send_daily_reports

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()

def create_app(config_name='default'):
    app = Flask(__name__)
    
    # Load the appropriate configuration
    if config_name == 'testing':
        app.config.from_object(config['testing'])
    else:
        app.config.from_object(config['default'])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    CORS(app)

    # Set up logging
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/ticketing.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Ticketing System startup')

    # Register blueprints
    from app.routes import bp as main_bp
    app.register_blueprint(main_bp)

    return app

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

# Update CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://modernhotels.management",
            "https://ticketing-system-gilt.vercel.app",
            "http://vm.vasantika.net:3000",
            "http://vm.vasantika.net",
            "https://ticketing-system-6f4u.onrender.com"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Credentials", "X-Requested-With"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 600
    }
})

# Initialize extensions
db.init_app(app)
migrate.init_app(app, db)

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
app.config['EMAIL_PASSWORD'] = os.getenv('EMAIL_PASSWORD', '')
jwt.init_app(app)

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

def init_scheduler():
    try:
        scheduler = BackgroundScheduler(timezone=pytz.timezone('America/New_York'))
        
        # Schedule daily reports to run at 6 PM Eastern Time
        scheduler.add_job(
            send_daily_reports,
            trigger=CronTrigger(hour=18, minute=0),  # 6 PM Eastern Time
            id='daily_reports',
            name='Send daily property reports',
            replace_existing=True,
            misfire_grace_time=3600  # Allow job to run up to 1 hour late if server was down
        )
        
        scheduler.start()
        app.logger.info("Scheduler started successfully. Daily reports will run at 6 PM Eastern Time.")
        app.logger.info("Next run time: %s", 
            scheduler.get_job('daily_reports').next_run_time.strftime("%Y-%m-%d %H:%M:%S %Z"))
            
    except Exception as e:
        app.logger.error(f"Failed to initialize scheduler: {str(e)}")
        # Re-raise the exception to ensure the error is noticed
        raise

# Add this to your app initialization
init_scheduler()

# Create the app instance
app = create_app(os.getenv('FLASK_ENV', 'default'))