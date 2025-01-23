from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

# Configure CORS
app.config['CORS_HEADERS'] = 'Content-Type'
CORS(app, 
    origins=["http://localhost:3000"],
    allow_credentials=True,
    supports_credentials=True,
    expose_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])

# Import routes and models after initializing extensions
from app import routes, models