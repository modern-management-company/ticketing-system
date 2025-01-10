from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS  # Import Flask-CORS
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

# Enable CORS for the entire application
CORS(app, resources={r"/*": {"origins": "*"}})

db = SQLAlchemy(app)
jwt = JWTManager(app)

# Import routes and models to register them with the app
from app import routes, models