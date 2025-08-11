from functools import wraps
from flask import jsonify, g
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from sqlalchemy.exc import SQLAlchemyError
from app import app
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.extensions import db

def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ExpiredSignatureError:
            # Rollback session if it exists and is invalid
            if hasattr(g, 'db_session') and g.db_session.is_active:
                g.db_session.rollback()
            return jsonify({'message': 'Token has expired'}), 401
        except InvalidTokenError:
            # Rollback session if it exists and is invalid
            if hasattr(g, 'db_session') and g.db_session.is_active:
                g.db_session.rollback()
            return jsonify({'message': 'Invalid token'}), 401
        except SQLAlchemyError as e:
            app.logger.error(f'Database error: {str(e)}')
            # Always rollback on database errors
            try:
                db.session.rollback()
            except Exception as rollback_error:
                app.logger.error(f'Error during session rollback: {str(rollback_error)}')
            return jsonify({'message': 'Database error occurred'}), 500
        except Exception as e:
            app.logger.error(f'Error: {str(e)}')
            # Rollback session if it exists and is invalid
            if hasattr(g, 'db_session') and g.db_session.is_active:
                g.db_session.rollback()
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
    # Store the current session in g for potential cleanup
    g.db_session = db.session

@app.after_request
def after_request(response):
    # Clean up the session after each request
    try:
        if hasattr(g, 'db_session') and g.db_session.is_active:
            # If there was an error, rollback
            if response.status_code >= 400:
                g.db_session.rollback()
            else:
                # Commit if everything went well
                g.db_session.commit()
    except Exception as e:
        app.logger.error(f'Error during session cleanup: {str(e)}')
        try:
            g.db_session.rollback()
        except Exception as rollback_error:
            app.logger.error(f'Error during rollback cleanup: {str(rollback_error)}')
    finally:
        # Remove the session from g
        if hasattr(g, 'db_session'):
            del g.db_session
    
    return response

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    # Always rollback on 500 errors
    try:
        if hasattr(g, 'db_session') and g.db_session.is_active:
            g.db_session.rollback()
    except Exception as e:
        app.logger.error(f'Error during 500 error rollback: {str(e)}')
    return jsonify({'message': 'Internal server error'}), 500 