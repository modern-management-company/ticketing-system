import threading
from flask import current_app
from app.services.sms_service import SMSService

class AsyncSMSService:
    """
    Asynchronous wrapper for SMSService. Uses threading to send SMS messages
    in the background without blocking the main application.
    """
    
    def __init__(self):
        # Don't initialize SMSService here - will do it lazily in _send_async
        pass
    
    def _send_async(self, method_name, *args, **kwargs):
        """
        Generic method to execute any SMSService method asynchronously
        
        Args:
            method_name: Name of the SMSService method to call
            *args: Positional arguments to pass to the method
            **kwargs: Keyword arguments to pass to the method
        """
        def _task():
            try:
                # Create SMSService inside the thread with app context
                with current_app.app_context():
                    sms_service = SMSService()
                    sms_method = getattr(sms_service, method_name)
                    sms_method(*args, **kwargs)
            except Exception as e:
                # Log the error but don't propagate it since we're in a background thread
                import logging
                logging.error(f"Error sending SMS asynchronously ({method_name}): {str(e)}")
        
        # Create and start a thread for the SMS task
        thread = threading.Thread(target=_task)
        thread.daemon = True  # Thread will exit when main thread exits
        thread.start()
        
        return True  # Return immediately, not waiting for the SMS to be sent
    
    def send_sms(self, to_number, message):
        """Async wrapper for send_sms"""
        return self._send_async('send_sms', to_number, message)
    
    def send_housekeeping_request_notification(self, room_number, guest_request, staff_number):
        """Async wrapper for send_housekeeping_request_notification"""
        return self._send_async('send_housekeeping_request_notification', room_number, guest_request, staff_number)
    
    def send_guest_confirmation(self, guest_number, room_number, request_type):
        """Async wrapper for send_guest_confirmation"""
        return self._send_async('send_guest_confirmation', guest_number, room_number, request_type)
    
    def send_completion_notification(self, guest_number, room_number, request_type):
        """Async wrapper for send_completion_notification"""
        return self._send_async('send_completion_notification', guest_number, room_number, request_type) 