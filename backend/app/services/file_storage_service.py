import os
from datetime import datetime
import uuid
import logging
from flask import current_app
from werkzeug.utils import secure_filename

class FileStorageService:
    def __init__(self):
        self.upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        self.max_content_length = current_app.config.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)  # 16MB default
        
        # Ensure upload directory exists
        os.makedirs(self.upload_folder, exist_ok=True)
        
        current_app.logger.debug(f"Initialized FileStorageService with upload folder: {self.upload_folder}")

    def _get_file_path(self, ticket_id: int, filename: str) -> str:
        """Generate a secure file path for storage"""
        # Create a path structure: ticket_id/year/month/day/filename
        now = datetime.utcnow()
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create directory structure
        path_parts = [
            str(ticket_id),
            str(now.year),
            f"{now.month:02d}",
            f"{now.day:02d}"
        ]
        
        # Join all parts to create the full path
        relative_path = os.path.join(*path_parts, unique_filename)
        full_path = os.path.join(self.upload_folder, relative_path)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        return relative_path, full_path

    def upload_file(self, file, ticket_id: int) -> dict:
        """
        Upload a file to the local filesystem and return the file information
        
        Args:
            file: FileStorage object from Flask
            ticket_id: ID of the ticket this file belongs to
            
        Returns:
            dict: File information including path and metadata
        """
        try:
            # Generate secure file path
            relative_path, full_path = self._get_file_path(ticket_id, file.filename)
            
            # Save the file
            file.save(full_path)
            
            # Get file size
            file_size = os.path.getsize(full_path)
            
            return {
                'file_name': file.filename,
                'file_path': relative_path,
                'file_type': file.content_type,
                'file_size': file_size
            }
            
        except Exception as e:
            current_app.logger.error(f"Error uploading file: {str(e)}")
            raise

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from the filesystem
        
        Args:
            file_path: Relative path to the file
            
        Returns:
            bool: True if deletion was successful, False otherwise
        """
        try:
            full_path = os.path.join(self.upload_folder, file_path)
            if os.path.exists(full_path):
                os.remove(full_path)
                return True
            return False
        except Exception as e:
            current_app.logger.error(f"Error deleting file: {str(e)}")
            return False

    def get_file_path(self, file_path: str) -> str:
        """
        Get the full filesystem path for a file
        
        Args:
            file_path: Relative path to the file
            
        Returns:
            str: Full filesystem path
        """
        return os.path.join(self.upload_folder, file_path) 