#!/bin/bash

# Kill any existing gunicorn processes
pkill gunicorn || true

# Initialize the database with test data
export FLASK_APP=run.py
export FLASK_ENV=development

# Drop and recreate tables
python3 setup_db.py

# Start gunicorn
gunicorn --bind 0.0.0.0:5000 run:app --reload 