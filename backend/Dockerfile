# Use Python 3.11 as the base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Make start.sh executable
RUN chmod +x start.sh

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=run.py
ENV FLASK_ENV=production

# Command to run the application
CMD ["./start.sh"] 