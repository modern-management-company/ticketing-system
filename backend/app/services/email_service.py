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
        self.smtp_password = current_app.config.get('EMAIL_PASSWORD', '')  # Only password from config
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