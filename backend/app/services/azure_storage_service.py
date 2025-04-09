import os
from datetime import datetime
import uuid
import logging
from azure.storage.blob import BlobServiceClient, ContentSettings
from flask import current_app
from werkzeug.utils import secure_filename

class AzureStorageService:
    def __init__(self, account_name, account_key, container_name):
        self.account_name = account_name
        self.account_key = account_key
        self.container_name = container_name
        
        # Initialize Azure Blob Service Client
        connection_string = f"DefaultEndpointsProtocol=https;AccountName={account_name};AccountKey={account_key};EndpointSuffix=core.windows.net"
        self.blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        
        # Get container client
        self.container_client = self.blob_service_client.get_container_client(container_name)
        
        current_app.logger.debug(f"Initialized AzureStorageService with container: {container_name}")

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
        return os.path.join(*path_parts, unique_filename)

    def upload_file(self, file, ticket_id: int) -> dict:
        """
        Upload a file to Azure Blob Storage and return the file information
        
        Args:
            file: FileStorage object from Flask
            ticket_id: ID of the ticket this file belongs to
            
        Returns:
            dict: File information including path and metadata
        """
        try:
            # Generate secure file path
            file_path = self._get_file_path(ticket_id, file.filename)
            
            # Get blob client
            blob_client = self.container_client.get_blob_client(file_path)
            
            # Upload the file
            content_settings = ContentSettings(content_type=file.content_type)
            blob_client.upload_blob(
                file,
                content_settings=content_settings,
                overwrite=True
            )
            
            # Get the file size
            file_size = file.content_length if hasattr(file, 'content_length') else None
            
            return {
                'file_name': file.filename,
                'file_path': file_path,
                'file_type': file.content_type,
                'file_size': file_size
            }
            
        except Exception as e:
            current_app.logger.error(f"Error uploading file to Azure: {str(e)}")
            raise

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from Azure Blob Storage
        
        Args:
            file_path: Path to the file in Azure
            
        Returns:
            bool: True if deletion was successful, False otherwise
        """
        try:
            blob_client = self.container_client.get_blob_client(file_path)
            blob_client.delete_blob()
            return True
        except Exception as e:
            current_app.logger.error(f"Error deleting file from Azure: {str(e)}")
            return False

    def get_file_url(self, file_path: str, expires_in: int = 3600) -> str:
        """
        Get a SAS URL for a file
        
        Args:
            file_path: Path to the file in Azure
            expires_in: Number of seconds until the URL expires (default 1 hour)
            
        Returns:
            str: SAS URL for the file
        """
        try:
            blob_client = self.container_client.get_blob_client(file_path)
            url = blob_client.url
            return url
        except Exception as e:
            current_app.logger.error(f"Error generating file URL: {str(e)}")
            raise 