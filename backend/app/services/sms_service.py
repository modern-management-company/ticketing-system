from flask import current_app
from twilio.rest import Client
import logging
import os

class SMSService:
    def __init__(self):
        # Get Twilio settings from configuration
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.from_number = os.getenv('TWILIO_FROM_NUMBER')
        self.enable_sms = current_app.config.get('ENABLE_SMS_NOTIFICATIONS', False)
        self.logger = current_app.logger
        
        if self.enable_sms and self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None

    def send_sms(self, to_number, message):
        """Send SMS using Twilio"""
        if not self.client:
            current_app.logger.warning("Twilio credentials not configured. SMS not sent.")
            return False
            
        try:
            message = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number
            )
            current_app.logger.info(f"SMS sent successfully. SID: {message.sid}")
            return True
        except Exception as e:
            current_app.logger.error(f"Error sending SMS: {str(e)}")
            return False

    def send_housekeeping_request_notification(self, room_number, guest_request, staff_number):
        """Send housekeeping request notification to staff"""
        message = f"""
Housekeeping Request:
Room: {room_number}
Request: {guest_request}
Please attend to this request as soon as possible.
"""
        return self.send_sms(staff_number, message)

    def send_guest_confirmation(self, guest_number, room_number, request_type):
        """Send confirmation to guest that their request was received"""
        message = f"""
Thank you for your request. Our housekeeping team has been notified and will deliver {request_type} to Room {room_number} shortly.
"""
        return self.send_sms(guest_number, message)

    def send_completion_notification(self, guest_number, room_number, request_type):
        """Send completion notification to guest"""
        message = f"""
Your request for {request_type} has been completed. If you need anything else, please don't hesitate to ask.
"""
        return self.send_sms(guest_number, message) 