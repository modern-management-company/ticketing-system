#!/bin/bash

# Kill any existing gunicorn processes
pkill gunicorn || true

# Initialize the database with test data
export FLASK_APP=run.py
export FLASK_ENV=development

# Drop and recreate tables
python3 setup_db.py

# Start gunicorn with proper worker configuration for scheduler
gunicorn --bind 0.0.0.0:5000 run:app \
    --reload \
    --workers 1 \
    --threads 4 \
    --timeout 120 \
    --access-logfile logs/gunicorn_access.log \
    --error-logfile logs/gunicorn_error.log \
    --capture-output \
    --enable-stdio-inheritance 