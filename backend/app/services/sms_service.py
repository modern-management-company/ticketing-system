from flask import current_app
from twilio.rest import Client
import logging
import os
from app.models import SMSSettings

class SMSService:
    def __init__(self):
        # Try to get SMS settings from database
        self.logger = current_app.logger
        try:
            from app import db
            sms_settings = SMSSettings.query.order_by(SMSSettings.id.desc()).first()
            
            if sms_settings:
                self.logger.info("Using SMS settings from database")
                self.account_sid = sms_settings.account_sid
                self.auth_token = sms_settings.auth_token
                self.from_number = sms_settings.from_number
                self.enable_sms = sms_settings.enable_sms_notifications
            else:
                self.logger.info("No SMS settings found in database, using environment variables")
                # Fall back to environment variables
                self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
                self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
                self.from_number = os.getenv('TWILIO_FROM_NUMBER')
                self.enable_sms = current_app.config.get('ENABLE_SMS_NOTIFICATIONS', False)
        except Exception as e:
            self.logger.error(f"Error loading SMS settings: {str(e)}")
            # Fall back to environment variables if there's any error
            self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
            self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
            self.from_number = os.getenv('TWILIO_FROM_NUMBER')
            self.enable_sms = current_app.config.get('ENABLE_SMS_NOTIFICATIONS', False)
        
        if self.enable_sms and self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None

    def send_sms(self, to_number, message):
        """Send SMS using Twilio"""
        if not self.enable_sms or not self.client:
            self.logger.info("SMS notifications are disabled or not configured")
            return False

        try:
            self.logger.info(f"Sending SMS to {to_number}")
            self.logger.debug(f"Message: {message}")
            
            # Remove any leading/trailing whitespace
            message = message.strip()
            
            # Validate phone number format (ensure it has +country code)
            if not to_number.startswith('+'):
                to_number = '+' + to_number
                
            # Send the message
            message_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number
            )
            
            self.logger.info(f"SMS sent successfully, SID: {message_obj.sid}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to send SMS: {str(e)}")
            return False

    def send_housekeeping_request_notification(self, room_number, guest_request, staff_number):
        """Send housekeeping request notification to staff"""
        message = f"Housekeeping Request: {room_number}\n{guest_request}"
        return self.send_sms(staff_number, message)

    def send_guest_confirmation(self, guest_number, room_number, request_type):
        """Send confirmation to guest"""
        message = f"Your request for {request_type} in room {room_number} has been received and is being processed."
        return self.send_sms(guest_number, message)

    def send_completion_notification(self, guest_number, room_number, request_type):
        """Send completion notification to guest"""
        message = f"Your request for {request_type} in room {room_number} has been completed."
        return self.send_sms(guest_number, message) 