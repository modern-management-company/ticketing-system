import os
from datetime import timedelta

class Config:
    # Database configuration
    SQLALCHEMY_DATABASE_URI = 'postgresql://username:password@localhost:5432/ticketing_system'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Secret key for session management
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'e80edff39567a78760a8d3a92ffce7c4e76fafabae06930d6b6e179600401a11'
    
    # JWT configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'e80edff39567a78760a8d3a92ffce7c4e76fafabae06930d6b6e179600401a11'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    
    # CORS configuration
    CORS_HEADERS = 'Content-Type'
    
    # File upload configuration (if needed)
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size 