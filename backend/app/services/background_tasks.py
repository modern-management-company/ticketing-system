from threading import Thread
from flask import current_app
from app.services.async_email_service import AsyncEmailService
from app.services.async_sms_service import AsyncSMSService

# Local function to get services within app context
def _get_email_service():
    return AsyncEmailService()

def _get_sms_service():
    return AsyncSMSService()

def send_email_async(email_service, recipient_email, subject, html_content):
    """Send email asynchronously"""
    with current_app.app_context():
        email_service.send_email(recipient_email, subject, html_content)

def send_task_notification_async(task, user, property_name):
    """Send task notification asynchronously"""
    def _send():
        with current_app.app_context():
            _get_email_service().send_task_assignment_notification(user, task, property_name)
    Thread(target=_send).start()

def send_ticket_notification_async(ticket, property_name, recipients, notification_type="new", changes=None, updated_by=None):
    """Send ticket notification asynchronously"""
    def _send():
        with current_app.app_context():
            _get_email_service().send_ticket_notification(
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
            sms_service = _get_sms_service()
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

def send_user_registration_notification_async(user, password, registered_by=None):
    """Send user registration notification asynchronously"""
    def _send():
        with current_app.app_context():
            _get_email_service().send_user_registration_email(user, password, registered_by)
    Thread(target=_send).start()

def send_user_management_notification_async(user, changes, updated_by, admin_emails, change_type):
    """Send user management notification asynchronously"""
    def _send():
        with current_app.app_context():
            _get_email_service().send_user_management_notification(
                user=user,
                changes=changes,
                updated_by=updated_by,
                admin_emails=admin_emails,
                change_type=change_type
            )
    Thread(target=_send).start()

def send_password_reset_notification_async(user, reset_by, is_self_reset):
    """Send password reset notification asynchronously"""
    def _send():
        with current_app.app_context():
            _get_email_service().send_password_reset_notification(
                user=user,
                reset_by=reset_by,
                is_self_reset=is_self_reset
            )
    Thread(target=_send).start()

def send_password_reset_link_async(user, reset_token):
    """Send password reset link asynchronously"""
    def _send():
        with current_app.app_context():
            _get_email_service().send_password_reset_notification(
                user=user,
                reset_token=reset_token
            )
    Thread(target=_send).start()

def send_admin_alert_async(subject, message, admin_emails):
    """Send admin alert asynchronously"""
    def _send():
        with current_app.app_context():
            _get_email_service().send_admin_alert(
                subject=subject,
                message=message,
                admin_emails=admin_emails
            )
    Thread(target=_send).start()

def send_room_status_notification_async(room, property_name, old_status, new_status, recipients):
    """Send room status change notification asynchronously"""
    def _send():
        with current_app.app_context():
            _get_email_service().send_room_status_notification(
                room=room,
                property_name=property_name,
                old_status=old_status,
                new_status=new_status,
                recipients=recipients
            )
    Thread(target=_send).start()

def send_property_status_notification_async(property, old_status, new_status, recipients):
    """Send property status change notification asynchronously"""
    def _send():
        with current_app.app_context():
            _get_email_service().send_property_status_notification(
                property=property,
                old_status=old_status,
                new_status=new_status,
                recipients=recipients
            )
    Thread(target=_send).start() 