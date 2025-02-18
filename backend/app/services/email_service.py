from flask import current_app
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging

class EmailService:
    def __init__(self):
        # Direct SMTP settings for Gmail
        self.smtp_server = 'smtp.gmail.com'
        self.smtp_port = 587
        self.smtp_username = 'modernmanagementhotels@gmail.com'  # Your Gmail address
        self.smtp_password = current_app.config.get('EMAIL_PASSWORD', '')        
        self.sender_email = 'modernmanagementhotels@gmail.com'  # Same as username
        self.logger = current_app.logger

    def send_email(self, recipient_email, subject, html_content):
        try:
            self.logger.info(f"Preparing to send email to {recipient_email}")
            self.logger.info(f"Subject: {subject}")
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Property Management System <{self.sender_email}>"
            msg['To'] = recipient_email

            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            self.logger.info("Connecting to SMTP server...")
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                self.logger.info("Initiating TLS connection...")
                server.starttls()
                
                if not self.smtp_password:
                    self.logger.error("Email password not configured")
                    return False
                
                self.logger.info(f"Attempting login for {self.smtp_username}...")
                server.login(self.smtp_username, self.smtp_password)
                
                self.logger.info("Sending email...")
                server.send_message(msg)
                self.logger.info(f"✓ Email sent successfully to {recipient_email}")
                
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to send email: {str(e)}")
            self.logger.error(f"Error details: {type(e).__name__}")
            return False

    def send_task_assignment_notification(self, user, task, property_name):
        self.logger.info(f"Preparing task assignment notification for user {user.username} (ID: {user.user_id})")
        self.logger.info(f"Task details - ID: {task.task_id}, Title: {task.title}, Priority: {task.priority}")
        self.logger.info(f"Property: {property_name}")

        subject = f"New Task Assignment: {task.title}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">New Task Assignment</h2>
                    <p>Hello {user.username},</p>
                    <p>You have been assigned a new task:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Task:</strong> {task.title}</p>
                        <p><strong>Property:</strong> {property_name}</p>
                        <p><strong>Priority:</strong> <span style="color: {self._get_priority_color(task.priority)};">{task.priority}</span></p>
                        <p><strong>Due Date:</strong> {task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'Not set'}</p>
                        <p><strong>Description:</strong> {task.description}</p>
                    </div>
                    <p>Please log in to the system to view more details and update the task status.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        success = self.send_email(user.email, subject, html_content)
        if success:
            self.logger.info(f"✓ Task assignment notification sent successfully to {user.username} ({user.email})")
        else:
            self.logger.error(f"❌ Failed to send task assignment notification to {user.username} ({user.email})")
        return success

    def send_task_update_notification(self, user, task, property_name, update_type="status"):
        subject = f"Task Update: {task.title}"
        
        status_message = f"The status has been updated to: <span style='color: {self._get_status_color(task.status)};'>{task.status}</span>" if update_type == "status" else "The task details have been updated"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Task Update Notification</h2>
                    <p>Hello {user.username},</p>
                    <p>{status_message}</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Task:</strong> {task.title}</p>
                        <p><strong>Property:</strong> {property_name}</p>
                        <p><strong>Priority:</strong> <span style="color: {self._get_priority_color(task.priority)};">{task.priority}</span></p>
                        <p><strong>Status:</strong> <span style="color: {self._get_status_color(task.status)};">{task.status}</span></p>
                        <p><strong>Due Date:</strong> {task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'Not set'}</p>
                    </div>
                    <p>Please log in to the system to view more details.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        return self.send_email(user.email, subject, html_content)

    def send_task_reminder(self, user, task, property_name):
        subject = f"Task Reminder: {task.title}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Task Reminder</h2>
                    <p>Hello {user.username},</p>
                    <p>This is a reminder about your assigned task:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Task:</strong> {task.title}</p>
                        <p><strong>Property:</strong> {property_name}</p>
                        <p><strong>Priority:</strong> <span style="color: {self._get_priority_color(task.priority)};">{task.priority}</span></p>
                        <p><strong>Status:</strong> <span style="color: {self._get_status_color(task.status)};">{task.status}</span></p>
                        <p><strong>Due Date:</strong> {task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'Not set'}</p>
                    </div>
                    <p>Please update the task status if you've made progress.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        return self.send_email(user.email, subject, html_content)

    def send_user_registration_email(self, user, password, requested_by=None):
        subject = "Welcome to Property Management System - Your Account Details"
        
        requester_info = f"This account was requested by {requested_by.username} ({requested_by.email})." if requested_by else ""
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Welcome to Property Management System</h2>
                    <p>Hello {user.username},</p>
                    <p>Your account has been created successfully. {requester_info}</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Temporary Password:</strong> {password}</p>
                        <p><strong>Role:</strong> {user.role.capitalize()}</p>
                    </div>
                    <p>For security reasons, please change your password after your first login.</p>
                    <p>You can access the system using these credentials.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        success = self.send_email(user.email, subject, html_content)
        if success:
            self.logger.info(f"✓ Registration email sent successfully to {user.username} ({user.email})")
        else:
            self.logger.error(f"❌ Failed to send registration email to {user.username} ({user.email})")
        return success

    def _get_priority_color(self, priority):
        colors = {
            'Critical': '#dc3545',  # Red
            'High': '#fd7e14',      # Orange
            'Medium': '#ffc107',    # Yellow
            'Low': '#28a745'        # Green
        }
        return colors.get(priority, '#6c757d')  # Default gray

    def _get_status_color(self, status):
        colors = {
            'pending': '#ffc107',      # Yellow
            'in progress': '#17a2b8',  # Blue
            'completed': '#28a745'     # Green
        }
        return colors.get(status.lower(), '#6c757d')  # Default gray

    def send_ticket_notification(self, ticket, property_name, recipients, notification_type="new"):
        """
        Send ticket notifications to managers and admins
        notification_type can be: new, update, status_change
        """
        action = {
            "new": "created",
            "update": "updated",
            "status_change": "status changed"
        }.get(notification_type, "updated")

        subject = f"Ticket {action.title()}: {ticket.title} - {property_name}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Ticket {action.title()}</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Ticket ID:</strong> {ticket.ticket_id}</p>
                        <p><strong>Title:</strong> {ticket.title}</p>
                        <p><strong>Property:</strong> {property_name}</p>
                        <p><strong>Priority:</strong> <span style="color: {self._get_priority_color(ticket.priority)};">{ticket.priority}</span></p>
                        <p><strong>Status:</strong> <span style="color: {self._get_status_color(ticket.status)};">{ticket.status}</span></p>
                        <p><strong>Category:</strong> {ticket.category}</p>
                        <p><strong>Description:</strong> {ticket.description}</p>
                        <p><strong>Created By:</strong> {ticket.created_by_username}</p>
                    </div>
                    <p>Please log in to the system to view and manage this ticket.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        for recipient in recipients:
            self.send_email(recipient.email, subject, html_content)

    def send_room_status_notification(self, room, property_name, recipients, old_status=None):
        """Send room status change notifications"""
        subject = f"Room Status Update: {room.name} - {property_name}"
        
        status_change = f"from {old_status} to {room.status}" if old_status else f"to {room.status}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Room Status Update</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Room:</strong> {room.name}</p>
                        <p><strong>Property:</strong> {property_name}</p>
                        <p><strong>Status Changed:</strong> {status_change}</p>
                        <p><strong>Type:</strong> {room.type}</p>
                        <p><strong>Floor:</strong> {room.floor}</p>
                        <p><strong>Last Cleaned:</strong> {room.last_cleaned.strftime('%Y-%m-%d %H:%M') if room.last_cleaned else 'N/A'}</p>
                    </div>
                    <p>Please log in to the system to view more details.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        for recipient in recipients:
            self.send_email(recipient.email, subject, html_content)

    def send_property_status_notification(self, property_obj, recipients, old_status=None):
        """Send property status change notifications"""
        subject = f"Property Status Update: {property_obj.name}"
        
        status_change = f"from {old_status} to {property_obj.status}" if old_status else f"to {property_obj.status}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Property Status Update</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Property:</strong> {property_obj.name}</p>
                        <p><strong>Address:</strong> {property_obj.address}</p>
                        <p><strong>Status Changed:</strong> {status_change}</p>
                        <p><strong>Type:</strong> {property_obj.type}</p>
                    </div>
                    <p>Please log in to the system to view more details.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        for recipient in recipients:
            self.send_email(recipient.email, subject, html_content)

    def send_password_reset_notification(self, user, reset_token=None, admin_reset=False):
        """Send password reset notifications"""
        if admin_reset:
            subject = "Your Password Has Been Reset"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #1976d2;">Password Reset Notification</h2>
                        <p>Hello {user.username},</p>
                        <p>Your password has been reset by an administrator.</p>
                        <p>Please contact your system administrator for your new password.</p>
                        <p>For security reasons, please change your password after logging in.</p>
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                            <p style="color: #666;">Best regards,<br>Property Management System</p>
                        </div>
                    </div>
                </body>
            </html>
            """
        else:
            subject = "Password Reset Request"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #1976d2;">Password Reset Request</h2>
                        <p>Hello {user.username},</p>
                        <p>A password reset has been requested for your account.</p>
                        <p>Click the link below to reset your password:</p>
                        <p><a href="{reset_token}">Reset Password</a></p>
                        <p>If you didn't request this password reset, please ignore this email.</p>
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                            <p style="color: #666;">Best regards,<br>Property Management System</p>
                        </div>
                    </div>
                </body>
            </html>
            """

        return self.send_email(user.email, subject, html_content)

    def send_admin_alert(self, subject, message, admin_emails):
        """Send alert notifications to administrators"""
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Admin Alert</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        {message}
                    </div>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        for email in admin_emails:
            self.send_email(email, subject, html_content) 