from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://username:password@localhost:5432/ticketing_system'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = '881c5925ff33ececa8671ea4172e8b41cdb21ceeeebaa1b29ed18f62c3b7d529'

db = SQLAlchemy(app)
jwt = JWTManager(app)

# # Drop all tables when the application context ends
# @app.teardown_appcontext
# def cleanup(exception=None):
#     if exception is None:
#         print("Dropping all tables...")
#         db.drop_all()

# Import routes to register them with the app
from app import routes, models
