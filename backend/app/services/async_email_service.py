import threading
from flask import current_app
from app.services.email_service import EmailService

class AsyncEmailService:
    """
    Asynchronous wrapper for EmailService. Uses threading to send emails
    in the background without blocking the main application.
    """
    
    def __init__(self):
        # Don't initialize EmailService here - will do it lazily in _send_async
        pass
    
    def _send_async(self, method_name, *args, **kwargs):
        """
        Generic method to execute any EmailService method asynchronously
        
        Args:
            method_name: Name of the EmailService method to call
            *args: Positional arguments to pass to the method
            **kwargs: Keyword arguments to pass to the method
        """
        def _task():
            try:
                # Create EmailService inside the thread with app context
                with current_app.app_context():
                    email_service = EmailService()
                    email_method = getattr(email_service, method_name)
                    email_method(*args, **kwargs)
            except Exception as e:
                # Log the error but don't propagate it since we're in a background thread
                import logging
                logging.error(f"Error sending email asynchronously ({method_name}): {str(e)}")
        
        # Create and start a thread for the email task
        thread = threading.Thread(target=_task)
        thread.daemon = True  # Thread will exit when main thread exits
        thread.start()
        
        return True  # Return immediately, not waiting for the email to be sent
    
    def send_email(self, recipient_email, subject, html_content):
        """Async wrapper for send_email"""
        return self._send_async('send_email', recipient_email, subject, html_content)
    
    def send_task_assignment_notification(self, user, task, property_name):
        """Async wrapper for send_task_assignment_notification"""
        return self._send_async('send_task_assignment_notification', user, task, property_name)
    
    def send_task_update_notification(self, user, task, property_name, update_type="status"):
        """Async wrapper for send_task_update_notification"""
        return self._send_async('send_task_update_notification', user, task, property_name, update_type)
    
    def send_task_reminder(self, user, task, property_name):
        """Async wrapper for send_task_reminder"""
        return self._send_async('send_task_reminder', user, task, property_name)
    
    def send_user_registration_email(self, user, password, requested_by=None):
        """Async wrapper for send_user_registration_email"""
        return self._send_async('send_user_registration_email', user, password, requested_by)
    
    def send_ticket_notification(self, ticket, property_name, recipients, notification_type="new", changes=None, updated_by=None):
        """Async wrapper for send_ticket_notification"""
        return self._send_async('send_ticket_notification', ticket, property_name, recipients, notification_type, changes, updated_by)
    
    def send_room_status_notification(self, room, property_name, recipients, old_status=None):
        """Async wrapper for send_room_status_notification"""
        return self._send_async('send_room_status_notification', room, property_name, recipients, old_status)
    
    def send_property_status_notification(self, property_obj, recipients, old_status=None):
        """Async wrapper for send_property_status_notification"""
        return self._send_async('send_property_status_notification', property_obj, recipients, old_status)
    
    def send_password_reset_notification(self, user, reset_token=None, admin_reset=False):
        """Async wrapper for send_password_reset_notification"""
        return self._send_async('send_password_reset_notification', user, reset_token, admin_reset)
    
    def send_admin_alert(self, subject, message, admin_emails):
        """Async wrapper for send_admin_alert"""
        return self._send_async('send_admin_alert', subject, message, admin_emails)
    
    def send_user_management_notification(self, user, changes, updated_by, admin_emails, change_type="update"):
        """Async wrapper for send_user_management_notification"""
        return self._send_async('send_user_management_notification', user, changes, updated_by, admin_emails, change_type) 