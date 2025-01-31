from app import app, db
from app.models import User, Property, Ticket, TaskAssignment, Room, Task, Activity, PropertyTheme, SystemSettings
from werkzeug.security import generate_password_hash
from datetime import datetime
from sqlalchemy import text

def clear_database():
    with app.app_context():
        # Drop all tables with CASCADE to handle dependencies
        db.session.execute(text('DROP TABLE IF EXISTS activities CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS task_assignments CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS tickets CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS rooms CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS tasks CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS properties CASCADE'))
        db.session.execute(text('DROP TABLE IF EXISTS users CASCADE'))
        db.session.commit()
        
        # Recreate all tables
        print("Creating fresh tables...")
        db.create_all()
        
        print("Database cleared and recreated successfully!")

def setup_database():
    with app.app_context():
        # Drop all existing tables
        db.drop_all()
        
        # Create all tables
        db.create_all()
        
        print("Database tables created successfully!")

        # Create initial super admin user if no users exist
        if not User.query.first():
            super_admin = User(
                username='admin',
                email='admin@example.com',
                password='admin123',
                role='super_admin'
            )
            db.session.add(super_admin)
            
            # Create default system settings
            default_settings = SystemSettings()
            db.session.add(default_settings)
            
            db.session.commit()
            print("Initial super admin user and system settings created!")

if __name__ == '__main__':
    setup_database() 