from supabase import create_client, Client
from flask import current_app
import os
from datetime import datetime
import uuid
import logging

class SupabaseService:
    def __init__(self):
        supabase_url = current_app.config.get('SUPABASE_URL')
        supabase_key = current_app.config.get('SUPABASE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase configuration is missing")
        
        try:
            # Log the configuration (without the key)
            current_app.logger.debug(f"Initializing Supabase client with URL: {supabase_url}")
            
            # Create client following official documentation
            self.client: Client = create_client(supabase_url, supabase_key)
            
            self.bucket_name = current_app.config.get('SUPABASE_BUCKET_NAME', 'ticket-attachments')
            current_app.logger.debug(f"Supabase client initialized successfully with bucket: {self.bucket_name}")
            
        except Exception as e:
            current_app.logger.error(f"Failed to initialize Supabase client: {str(e)}")
            current_app.logger.error(f"Supabase URL: {supabase_url}")
            raise ValueError(f"Failed to initialize Supabase client: {str(e)}")

    def upload_file(self, file, ticket_id: int) -> dict:
        """
        Upload a file to Supabase storage and return the file information
        
        Args:
            file: FileStorage object from Flask
            ticket_id: ID of the ticket this file belongs to
            
        Returns:
            dict: File information including path and metadata
        """
        try:
            # Generate a unique filename
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Create a path structure: ticket_id/year/month/day/filename
            now = datetime.utcnow()
            file_path = f"{ticket_id}/{now.year}/{now.month:02d}/{now.day:02d}/{unique_filename}"
            
            # Read file content
            file_content = file.read()
            
            # Upload the file following official documentation
            current_app.logger.debug(f"Uploading file to path: {file_path}")
            result = self.client.storage.from_(self.bucket_name).upload(
                file_path,
                file_content,
                file.content_type
            )
            
            # Get the public URL
            file_url = self.client.storage.from_(self.bucket_name).get_public_url(file_path)
            
            return {
                'file_name': file.filename,
                'file_path': file_path,
                'file_type': file.content_type,
                'file_size': file.content_length,
                'file_url': file_url
            }
            
        except Exception as e:
            current_app.logger.error(f"Error uploading file to Supabase: {str(e)}")
            raise

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from Supabase storage
        
        Args:
            file_path: Path to the file in Supabase storage
            
        Returns:
            bool: True if deletion was successful, False otherwise
        """
        try:
            # Delete file following official documentation
            self.client.storage.from_(self.bucket_name).remove([file_path])
            return True
        except Exception as e:
            current_app.logger.error(f"Error deleting file from Supabase: {str(e)}")
            return False

    def get_file_url(self, file_path: str) -> str:
        """
        Get the public URL for a file
        
        Args:
            file_path: Path to the file in Supabase storage
            
        Returns:
            str: Public URL for the file
        """
        try:
            return self.client.storage.from_(self.bucket_name).get_public_url(file_path)
        except Exception as e:
            current_app.logger.error(f"Error getting file URL from Supabase: {str(e)}")
            raise 