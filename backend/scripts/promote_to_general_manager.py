#!/usr/bin/env python3
"""
Script to promote an existing manager to a general manager role.
Usage: python promote_to_general_manager.py <username or user_id>
"""

import sys
import os
from flask import Flask
from app.extensions import db
from app.models import User, Property

def promote_user(user_identifier):
    """Promote a manager to general_manager role"""
    # Try to find the user by ID first
    try:
        user_id = int(user_identifier)
        user = User.query.get(user_id)
    except ValueError:
        # If not an integer, try by username
        user = User.query.filter_by(username=user_identifier).first()
    
    if not user:
        print(f"Error: User '{user_identifier}' not found.")
        return False
    
    if user.role != 'manager':
        print(f"Error: User '{user.username}' is not a manager (current role: {user.role}).")
        return False
    
    # Verify the user has managed properties
    if user.managed_properties.count() == 0:
        print(f"Warning: User '{user.username}' does not manage any properties.")
        proceed = input("Do you still want to promote this user to general manager? (y/n): ")
        if proceed.lower() != 'y':
            print("Operation cancelled.")
            return False
    
    # Promote the user
    old_role = user.role
    user.role = 'general_manager'
    db.session.commit()
    
    print(f"Success: User '{user.username}' (ID: {user.user_id}) promoted from {old_role} to general_manager.")
    print(f"The user now manages {user.managed_properties.count()} properties.")
    
    return True

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python promote_to_general_manager.py <username or user_id>")
        sys.exit(1)
    
    # Import the Flask app
    from app import app
    
    with app.app_context():
        if promote_user(sys.argv[1]):
            sys.exit(0)
        else:
            sys.exit(1) 