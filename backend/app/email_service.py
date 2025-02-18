import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from app import app

class EmailService:
    def __init__(self):
        self.smtp_server = 'smtp.gmail.com'
        self.smtp_port = 587
        self.smtp_username = 'modernmanagementhotels@gmail.com'
        self.smtp_password = os.getenv('EMAIL_PASSWORD')

    def _get_priority_color(self, priority):
        colors = {
            'high': '#dc3545',
            'medium': '#ffc107',
            'low': '#28a745'
        }
        return colors.get(priority.lower(), '#6c757d')

    def _get_status_color(self, status):
        colors = {
            'open': '#28a745',
            'in_progress': '#ffc107',
            'closed': '#6c757d',
            'pending': '#17a2b8',
            'cancelled': '#dc3545',
            'available': '#28a745',
            'occupied': '#ffc107',
            'maintenance': '#dc3545',
            'cleaning': '#17a2b8',
            'reserved': '#6c757d',
            'active': '#28a745',
            'inactive': '#dc3545',
            'suspended': '#ffc107'
        }
        return colors.get(status.lower(), '#6c757d')

    def send_email(self, to_email, subject, html_content):
        try:
            if not self.smtp_password:
                app.logger.error("Email password not configured")
                return False

            msg = MIMEMultipart()
            msg['From'] = self.smtp_username
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(html_content, 'html'))

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            app.logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            app.logger.error(f"Failed to send email: {str(e)}")
            return False

    def send_ticket_notification(self, ticket, property_name, recipients, notification_type="new"):
        """Send ticket notifications for new tickets, updates, and status changes."""
        try:
            subject_prefix = {
                "new": "New Ticket Created",
                "update": "Ticket Updated",
                "status_change": "Ticket Status Changed"
            }.get(notification_type, "Ticket Notification")

            subject = f"{subject_prefix} - {ticket.title}"

            for recipient in recipients:
                html_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">{subject_prefix}</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Title:</strong> {ticket.title}</p>
                        <p><strong>Description:</strong> {ticket.description}</p>
                        <p><strong>Priority:</strong> <span style="color: {self._get_priority_color(ticket.priority)};">{ticket.priority}</span></p>
                        <p><strong>Status:</strong> <span style="color: {self._get_status_color(ticket.status)};">{ticket.status}</span></p>
                        <p><strong>Category:</strong> {ticket.category}</p>
                        <p><strong>Property:</strong> {property_name}</p>
                    </div>
                    <p>Please log in to the system to view more details and take necessary actions.</p>
                </div>
                """
                self.send_email(recipient.email, subject, html_content)

        except Exception as e:
            app.logger.error(f"Error sending ticket notification: {str(e)}")

    def send_room_status_notification(self, room, property_name, old_status, new_status, recipients):
        """Send notifications when a room's status changes."""
        try:
            subject = f"Room Status Changed - {room.name}"

            for recipient in recipients:
                html_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Room Status Update</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Room:</strong> {room.name}</p>
                        <p><strong>Property:</strong> {property_name}</p>
                        <p><strong>Previous Status:</strong> <span style="color: {self._get_status_color(old_status)};">{old_status}</span></p>
                        <p><strong>New Status:</strong> <span style="color: {self._get_status_color(new_status)};">{new_status}</span></p>
                        <p><strong>Type:</strong> {room.type}</p>
                        <p><strong>Floor:</strong> {room.floor}</p>
                    </div>
                    <p>Please log in to the system to view more details.</p>
                </div>
                """
                self.send_email(recipient.email, subject, html_content)

        except Exception as e:
            app.logger.error(f"Error sending room status notification: {str(e)}")

    def send_property_status_notification(self, property, old_status, new_status, recipients):
        """Send notifications when a property's status changes."""
        try:
            subject = f"Property Status Changed - {property.name}"

            for recipient in recipients:
                html_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Property Status Update</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Property:</strong> {property.name}</p>
                        <p><strong>Address:</strong> {property.address}</p>
                        <p><strong>Previous Status:</strong> <span style="color: {self._get_status_color(old_status)};">{old_status}</span></p>
                        <p><strong>New Status:</strong> <span style="color: {self._get_status_color(new_status)};">{new_status}</span></p>
                    </div>
                    <p>Please log in to the system to view more details.</p>
                </div>
                """
                self.send_email(recipient.email, subject, html_content)

        except Exception as e:
            app.logger.error(f"Error sending property status notification: {str(e)}")

    def send_password_reset_notification(self, user, reset_by, is_self_reset=False):
        """Send notification when a user's password is reset."""
        try:
            subject = "Password Reset Notification"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1976d2;">Password Reset Notification</h2>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p>Your password has been successfully reset.</p>
                    {"<p>You initiated this password reset.</p>" if is_self_reset else f"<p>This reset was performed by: {reset_by.username}</p>"}
                    <p>If you did not authorize this change, please contact support immediately.</p>
                </div>
                <p>For security reasons, please change your password upon your next login.</p>
            </div>
            """
            self.send_email(user.email, subject, html_content)

        except Exception as e:
            app.logger.error(f"Error sending password reset notification: {str(e)}")

    def send_password_reset_link(self, user, reset_token):
        """Send password reset link to user."""
        try:
            subject = "Password Reset Request"
            
            reset_link = f"https://modernhotels.management/reset-password?token={reset_token}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1976d2;">Password Reset Request</h2>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p>We received a request to reset your password.</p>
                    <p>Click the button below to reset your password:</p>
                    <p style="text-align: center; margin: 20px 0;">
                        <a href="{reset_link}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    </p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you did not request this reset, please ignore this email.</p>
                </div>
            </div>
            """
            self.send_email(user.email, subject, html_content)

        except Exception as e:
            app.logger.error(f"Error sending password reset link: {str(e)}")

    def send_admin_alert(self, subject, message, admin_emails):
        """Send alert notifications to administrators."""
        try:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1976d2;">Admin Alert</h2>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    {message}
                </div>
                <p>This is an automated alert. Please take appropriate action if necessary.</p>
            </div>
            """
            
            for admin_email in admin_emails:
                self.send_email(admin_email, subject, html_content)

        except Exception as e:
            app.logger.error(f"Error sending admin alert: {str(e)}") 