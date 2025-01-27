from functools import wraps
from flask import jsonify
from sqlalchemy.exc import SQLAlchemyError

def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except SQLAlchemyError as e:
            # Handle database errors
            return jsonify({'message': 'Database error occurred', 'error': str(e)}), 500
        except Exception as e:
            # Handle other unexpected errors
            return jsonify({'message': 'An unexpected error occurred', 'error': str(e)}), 500
    return decorated_function 