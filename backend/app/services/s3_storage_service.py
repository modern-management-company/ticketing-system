import os
from datetime import datetime
import uuid
import logging
import boto3
from botocore.exceptions import ClientError
from flask import current_app
from werkzeug.utils import secure_filename

class S3StorageService:
    def __init__(self, bucket_name, region, access_key, secret_key):
        self.bucket_name = bucket_name
        self.region = region
        self.access_key = access_key
        self.secret_key = secret_key
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )
        
        current_app.logger.debug(f"Initialized S3StorageService with bucket: {bucket_name}")

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
        Upload a file to S3 and return the file information
        
        Args:
            file: FileStorage object from Flask
            ticket_id: ID of the ticket this file belongs to
            
        Returns:
            dict: File information including path and metadata
        """
        try:
            # Generate secure file path
            file_path = self._get_file_path(ticket_id, file.filename)
            
            # Upload the file to S3
            self.s3_client.upload_fileobj(
                file,
                self.bucket_name,
                file_path,
                ExtraArgs={
                    'ContentType': file.content_type
                }
            )
            
            # Get the file size
            file_size = file.content_length if hasattr(file, 'content_length') else None
            
            return {
                'file_name': file.filename,
                'file_path': file_path,
                'file_type': file.content_type,
                'file_size': file_size
            }
            
        except ClientError as e:
            current_app.logger.error(f"Error uploading file to S3: {str(e)}")
            raise
        except Exception as e:
            current_app.logger.error(f"Error uploading file: {str(e)}")
            raise

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from S3
        
        Args:
            file_path: Path to the file in S3
            
        Returns:
            bool: True if deletion was successful, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_path
            )
            return True
        except ClientError as e:
            current_app.logger.error(f"Error deleting file from S3: {str(e)}")
            return False
        except Exception as e:
            current_app.logger.error(f"Error deleting file: {str(e)}")
            return False

    def get_file_url(self, file_path: str, expires_in: int = 3600) -> str:
        """
        Get a presigned URL for a file
        
        Args:
            file_path: Path to the file in S3
            expires_in: Number of seconds until the URL expires (default 1 hour)
            
        Returns:
            str: Presigned URL for the file
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': file_path
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            current_app.logger.error(f"Error generating presigned URL: {str(e)}")
            raise 