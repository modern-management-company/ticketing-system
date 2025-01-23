#!/bin/bash

# Kill any existing gunicorn processes
pkill gunicorn

# Initialize the database with test data
python3 setup_db.py

# Start gunicorn
gunicorn --bind 0.0.0.0:5000 run:app 