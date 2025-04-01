from supabase import create_client, Client
from flask import current_app
import os
from datetime import datetime
import uuid

class SupabaseService:
    def __init__(self):
        self.supabase: Client = create_client(
            current_app.config['SUPABASE_URL'],
            current_app.config['SUPABASE_KEY']
        )
        self.bucket_name = current_app.config['SUPABASE_BUCKET_NAME']

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
            
            # Create a path that includes the ticket ID and timestamp
            timestamp = datetime.utcnow().strftime('%Y/%m/%d')
            file_path = f"{ticket_id}/{timestamp}/{unique_filename}"
            
            # Upload the file to Supabase
            self.supabase.storage.from_(self.bucket_name).upload(
                file_path,
                file.read(),
                file.content_type
            )
            
            # Get the public URL for the file
            file_url = self.supabase.storage.from_(self.bucket_name).get_public_url(file_path)
            
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
            self.supabase.storage.from_(self.bucket_name).remove([file_path])
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
            return self.supabase.storage.from_(self.bucket_name).get_public_url(file_path)
        except Exception as e:
            current_app.logger.error(f"Error getting file URL from Supabase: {str(e)}")
            raise 