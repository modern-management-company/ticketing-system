#!/bin/bash

# Kill any existing processes
echo "Stopping existing processes..."
pkill -f "python.*run.py" || true
pkill -f "node.*react-scripts" || true

# Start backend server
echo "Starting backend server..."
cd backend
export FLASK_APP=run.py
export FLASK_ENV=development
python3 setup_db.py
python3 run.py &
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Start frontend server
echo "Starting frontend server..."
cd frontend
npm start 