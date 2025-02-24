from threading import Thread
from flask import current_app
from app.services.email_service import EmailService
from app.services.sms_service import SMSService

def send_email_async(email_service, recipient_email, subject, html_content):
    """Send email asynchronously"""
    with current_app.app_context():
        email_service.send_email(recipient_email, subject, html_content)

def send_task_notification_async(task, user, property_name):
    """Send task notification asynchronously"""
    def _send():
        with current_app.app_context():
            email_service = EmailService()
            email_service.send_task_assignment_notification(user, task, property_name)
    Thread(target=_send).start()

def send_ticket_notification_async(ticket, property_name, recipients, notification_type="new", changes=None, updated_by=None):
    """Send ticket notification asynchronously"""
    def _send():
        with current_app.app_context():
            email_service = EmailService()
            email_service.send_ticket_notification(
                ticket,
                property_name,
                recipients,
                notification_type,
                changes,
                updated_by
            )
    Thread(target=_send).start()

def send_service_request_notification_async(staff_members, room_name, request_details):
    """Send service request notification asynchronously"""
    def _send():
        with current_app.app_context():
            sms_service = SMSService()
            for staff in staff_members:
                if staff.phone:
                    try:
                        sms_service.send_housekeeping_request_notification(
                            room_name,
                            request_details,
                            staff.phone
                        )
                    except Exception as e:
                        current_app.logger.error(f"Error sending SMS to {staff.phone}: {str(e)}")
    Thread(target=_send).start() 