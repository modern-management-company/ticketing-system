from flask import current_app
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging

class EmailService:
    def __init__(self):
        # Get SMTP settings from configuration
        self.smtp_server = current_app.config.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = current_app.config.get('SMTP_PORT', 587)
        self.smtp_username = current_app.config.get('SMTP_USERNAME', 'modernmanagementhotels@gmail.com')
        self.smtp_password = current_app.config.get('EMAIL_PASSWORD', '')
        self.sender_email = current_app.config.get('SENDER_EMAIL', 'noreply@modernmanagementhotels.com')
        self.logger = current_app.logger

    def send_email(self, recipient_email, subject, html_content):
        try:
            self.logger.info("="*50)
            self.logger.info("Starting email send process")
            self.logger.info(f"SMTP Settings:")
            self.logger.info(f"Server: {self.smtp_server}")
            self.logger.info(f"Port: {self.smtp_port}")
            self.logger.info(f"Username: {self.smtp_username}")
            self.logger.info(f"Password length: {len(self.smtp_password)}")
            self.logger.info(f"Recipient: {recipient_email}")
            self.logger.info(f"Subject: {subject}")
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Property Management System <{self.sender_email}>"
            msg['To'] = recipient_email

            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            self.logger.info("Connecting to SMTP server...")
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.set_debuglevel(1)  # Enable SMTP debug mode
            
            self.logger.info("Initiating TLS connection...")
            server.starttls()
            
            self.logger.info(f"Attempting login for {self.smtp_username}...")
            server.login(self.smtp_username, self.smtp_password)
            
            self.logger.info("Sending email...")
            server.send_message(msg)
            self.logger.info(f"✓ Email sent successfully to {recipient_email}")
            
            server.quit()
            self.logger.info("SMTP connection closed")
            self.logger.info("="*50)
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            self.logger.error("❌ SMTP Authentication Error:")
            self.logger.error(f"Error code: {e.smtp_code}")
            self.logger.error(f"Error message: {e.smtp_error}")
            return False
        except smtplib.SMTPException as e:
            self.logger.error("❌ SMTP Error:")
            self.logger.error(str(e))
            return False
        except Exception as e:
            self.logger.error("❌ Unexpected error during email send:")
            self.logger.error(f"Error type: {type(e).__name__}")
            self.logger.error(f"Error message: {str(e)}")
            return False

    def send_task_assignment_notification(self, user, task, property_name):
        """Send task assignment notifications to relevant users"""
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

        # Track successful sends
        successful_sends = 0
        sent_to = set()

        # Get all relevant recipients
        from app.models import User, PropertyManager
        
        # Get super admins
        super_admins = User.query.filter_by(role='super_admin').all()
        
        # Get property managers
        property_managers = User.query.join(PropertyManager).filter(
            PropertyManager.property_id == task.property_id
        ).all()
        
        # Get department managers based on task category if available
        department_managers = []
        if hasattr(task, 'category'):
            department_managers = User.query.filter_by(
                role='manager',
                group=task.category
            ).all()
        
        # Combine all recipients
        recipients = list(set(super_admins + property_managers + department_managers + [user]))  # Include assigned user
        
        # Send to all recipients
        for recipient in recipients:
            if recipient.email not in sent_to:
                if self.send_email(recipient.email, subject, html_content):
                    successful_sends += 1
                    sent_to.add(recipient.email)
                    self.logger.info(f"✓ Task assignment notification sent to {recipient.role} {recipient.email}")
                else:
                    self.logger.error(f"❌ Failed to send task assignment notification to {recipient.role} {recipient.email}")

        return successful_sends

    def send_task_update_notification(self, user, task, property_name, update_type="status"):
        """Send notifications when a task is updated"""
        subject = f"Task Update: {task.title}"
        
        status_message = f"The status has been updated to: <span style='color: {self._get_status_color(task.status)};'>{task.status}</span>" if update_type == "status" else "The task details have been updated"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Task Update Notification</h2>
                    <p>Hello,</p>
                    <p>{status_message}</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Task:</strong> {task.title}</p>
                        <p><strong>Property:</strong> {property_name}</p>
                        <p><strong>Priority:</strong> <span style="color: {self._get_priority_color(task.priority)};">{task.priority}</span></p>
                        <p><strong>Status:</strong> <span style="color: {self._get_status_color(task.status)};">{task.status}</span></p>
                        <p><strong>Due Date:</strong> {task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'Not set'}</p>
                        <p><strong>Updated By:</strong> {user.username} ({user.group})</p>
                    </div>
                    <p>Please log in to the system to view more details.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        # Track successful sends
        successful_sends = 0
        sent_to = set()

        # Get all relevant recipients
        from app.models import User, PropertyManager
        
        # Get super admins
        super_admins = User.query.filter_by(role='super_admin').all()
        
        # Get property managers
        property_managers = User.query.join(PropertyManager).filter(
            PropertyManager.property_id == task.property_id
        ).all()
        
        # Get department managers based on task category if available
        department_managers = []
        if hasattr(task, 'category'):
            department_managers = User.query.filter_by(
                role='manager',
                group=task.category
            ).all()
        
        # Get task assignee if different from updater
        assignee = None
        if hasattr(task, 'assigned_to_id') and task.assigned_to_id != user.user_id:
            assignee = User.query.get(task.assigned_to_id)
        
        # Get task creator if different from updater and assignee
        creator = None
        if hasattr(task, 'created_by_id') and task.created_by_id not in [user.user_id, assignee.user_id if assignee else None]:
            creator = User.query.get(task.created_by_id)
        
        # Combine all recipients
        recipients = list(set(
            super_admins + 
            property_managers + 
            department_managers + 
            ([assignee] if assignee else []) +
            ([creator] if creator else []) +
            [user]  # Include the user who made the update
        ))
        
        # Send to all recipients
        for recipient in recipients:
            if recipient.email not in sent_to:
                if self.send_email(recipient.email, subject, html_content):
                    successful_sends += 1
                    sent_to.add(recipient.email)
                    self.logger.info(f"✓ Task update notification sent to {recipient.role} {recipient.email}")
                else:
                    self.logger.error(f"❌ Failed to send task update notification to {recipient.role} {recipient.email}")

        return successful_sends

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

    def send_ticket_notification(self, ticket, property_name, recipients, notification_type="new", changes=None, updated_by=None):
        """
        Send ticket notifications to managers, admins, and relevant users
        notification_type can be: new, update, status_change, deleted
        """
        action = {
            "new": "created",
            "update": "updated",
            "status_change": "status changed",
            "deleted": "deleted"
        }.get(notification_type, "updated")

        subject = f"Ticket {action.title()}: {ticket.title} - {property_name}"
        
        # Build changes section if available
        changes_html = ""
        if changes and len(changes) > 0:
            changes_html = f"""
                <div style="margin: 15px 0;">
                    <p><strong>Changes Made:</strong></p>
                    <ul>
                        {"".join(f"<li>{change}</li>" for change in changes)}
                    </ul>
                </div>
            """

        # Add updater information if available
        updater_html = f"<p><strong>Updated By:</strong> {updated_by}</p>" if updated_by else ""
        
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
                        {updater_html}
                    </div>
                    {changes_html}
                    <p>Please log in to the system to view and manage this ticket.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        # Track successful sends
        successful_sends = 0
        sent_to = set()

        # First, send to super admins (they get all notifications)
        for recipient in recipients:
            if recipient.role == 'super_admin' and recipient.email not in sent_to:
                if self.send_email(recipient.email, subject, html_content):
                    successful_sends += 1
                    sent_to.add(recipient.email)
                    self.logger.info(f"✓ Ticket notification sent to super admin {recipient.email}")
                else:
                    self.logger.error(f"❌ Failed to send ticket notification to super admin {recipient.email}")

        # Then send to property managers
        for recipient in recipients:
            if recipient.role == 'manager' and recipient.email not in sent_to:
                # Only send to managers if they manage this property or if their group matches the ticket category
                is_property_manager = any(pm.property_id == ticket.property_id for pm in recipient.managed_properties)
                is_department_manager = recipient.group and recipient.group.lower() == ticket.category.lower()
                
                if is_property_manager or is_department_manager:
                    if self.send_email(recipient.email, subject, html_content):
                        successful_sends += 1
                        sent_to.add(recipient.email)
                        self.logger.info(f"✓ Ticket notification sent to manager {recipient.email}")
                    else:
                        self.logger.error(f"❌ Failed to send ticket notification to manager {recipient.email}")

        # Finally, send to relevant users (ticket creator or assigned users)
        for recipient in recipients:
            if recipient.role == 'user' and recipient.email not in sent_to:
                # Send to users if:
                # 1. They created the ticket
                # 2. They are assigned to it
                # 3. They are in the same group/department as the ticket category
                is_creator = recipient.user_id == ticket.user_id
                is_assigned = hasattr(ticket, 'assigned_to_id') and recipient.user_id == ticket.assigned_to_id
                is_department_member = recipient.group and recipient.group.lower() == ticket.category.lower()
                
                if is_creator or is_assigned or is_department_member:
                    if self.send_email(recipient.email, subject, html_content):
                        successful_sends += 1
                        sent_to.add(recipient.email)
                        self.logger.info(f"✓ Ticket notification sent to user {recipient.email}")
                    else:
                        self.logger.error(f"❌ Failed to send ticket notification to user {recipient.email}")

        return successful_sends

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

    def send_user_management_notification(self, user, changes, updated_by, admin_emails, change_type="update"):
        """
        Send notifications about user management changes
        change_type can be: update, role_change, group_change, property_assignment, activation, deactivation
        """
        action = {
            "update": "updated",
            "role_change": "role changed",
            "group_change": "group changed",
            "property_assignment": "property assignments changed",
            "activation": "activated",
            "deactivation": "deactivated"
        }.get(change_type, "updated")

        # Prepare the subject
        subject = f"User Account {action.title()}: {user.username}"

        # Build changes section
        changes_html = ""
        if changes and len(changes) > 0:
            changes_html = f"""
                <div style="margin: 15px 0;">
                    <p><strong>Changes Made:</strong></p>
                    <ul>
                        {"".join(f"<li>{change}</li>" for change in changes)}
                    </ul>
                </div>
            """

        # Create HTML content for the email
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">User Account {action.title()}</h2>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Role:</strong> {user.role}</p>
                        <p><strong>Group:</strong> {user.group or 'N/A'}</p>
                        <p><strong>Updated By:</strong> {updated_by}</p>
                    </div>
                    {changes_html}
                    <p>Please log in to the system to view the complete account details.</p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666;">Best regards,<br>Property Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """

        # Track successful sends
        successful_sends = 0
        sent_to = set()  # Track unique recipients

        # First send to super admins
        for admin_email in admin_emails:
            if admin_email not in sent_to:
                if self.send_email(admin_email, subject, html_content):
                    successful_sends += 1
                    sent_to.add(admin_email)
                    self.logger.info(f"✓ User management notification sent to admin {admin_email}")
                else:
                    self.logger.error(f"❌ Failed to send user management notification to admin {admin_email}")

        # Then send to the affected user
        if user.email not in sent_to:
            if self.send_email(user.email, subject, html_content):
                successful_sends += 1
                sent_to.add(user.email)
                self.logger.info(f"✓ User management notification sent to user {user.email}")
            else:
                self.logger.error(f"❌ Failed to send user management notification to user {user.email}")

        return successful_sends

    def send_report_email(self, to_email, subject, content, is_html=False):
        """Send a report email to a user"""
        try:
            self.logger.info(f"Preparing to send report email to {to_email}")
            self.logger.info(f"Subject: {subject}")
            
            return self.send_email(to_email, subject, content)
            
        except Exception as e:
            self.logger.error(f"Error sending report email: {str(e)}")
            return False 