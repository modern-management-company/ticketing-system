from functools import wraps
from flask import jsonify
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from sqlalchemy.exc import SQLAlchemyError
from app import app
from flask_jwt_extended import get_jwt_identity, jwt_required

def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        except SQLAlchemyError as e:
            app.logger.error(f'Database error: {str(e)}')
            return jsonify({'message': 'Database error occurred'}), 500
        except Exception as e:
            app.logger.error(f'Error: {str(e)}')
            return jsonify({'message': 'An error occurred'}), 500
    return decorated_function

def require_role(roles):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user = get_jwt_identity()
            if not current_user or current_user['role'] not in roles:
                return jsonify({'message': 'Unauthorized'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Apply middleware to all routes
@app.before_request
def before_request():
    # Add any pre-request processing here
    pass


# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500 