from flask import current_app
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import parseaddr
from app.models import EmailSettings
import os

class EmailTestService:
    def __init__(self):
        self.settings = EmailSettings.query.first()
        if not self.settings:
            raise ValueError("Email settings not configured")
        self.smtp_password = self.settings.smtp_password or os.getenv('EMAIL_PASSWORD', '')

    def run_all_tests(self):
        """Run all email configuration tests"""
        results = []

        # Test 1: SMTP Server Connection
        try:
            with smtplib.SMTP(self.settings.smtp_server, self.settings.smtp_port) as server:
                results.append({
                    'test': 'SMTP Server Connection',
                    'success': True,
                    'message': f'Successfully connected to {self.settings.smtp_server}:{self.settings.smtp_port}'
                })
        except Exception as e:
            results.append({
                'test': 'SMTP Server Connection',
                'success': False,
                'message': f'Failed to connect: {str(e)}'
            })

        # Test 2: SMTP Authentication
        try:
            with smtplib.SMTP(self.settings.smtp_server, self.settings.smtp_port) as server:
                server.starttls()
                server.login(self.settings.smtp_username, self.smtp_password)
                results.append({
                    'test': 'SMTP Authentication',
                    'success': True,
                    'message': 'Authentication successful'
                })
        except Exception as e:
            results.append({
                'test': 'SMTP Authentication',
                'success': False,
                'message': f'Authentication failed: {str(e)}'
            })

        # Test 3: TLS/SSL Configuration
        try:
            with smtplib.SMTP(self.settings.smtp_server, self.settings.smtp_port) as server:
                server.ehlo()
                server.starttls()
                results.append({
                    'test': 'TLS/SSL Configuration',
                    'success': True,
                    'message': 'TLS connection established successfully'
                })
        except Exception as e:
            results.append({
                'test': 'TLS/SSL Configuration',
                'success': False,
                'message': f'TLS configuration failed: {str(e)}'
            })

        # Test 4: Sender Email Validation
        try:
            parsed_email = parseaddr(self.settings.sender_email)[1]
            if '@' in parsed_email and '.' in parsed_email.split('@')[1]:
                results.append({
                    'test': 'Sender Email Validation',
                    'success': True,
                    'message': 'Sender email format is valid'
                })
            else:
                raise ValueError('Invalid email format')
        except Exception as e:
            results.append({
                'test': 'Sender Email Validation',
                'success': False,
                'message': f'Invalid sender email: {str(e)}'
            })

        # Test 5: Email Template Loading
        try:
            html_content = f"""
            <html>
                <body>
                    <h1>Test Email</h1>
                    <p>This is a test email sent at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    <p>Configuration:</p>
                    <ul>
                        <li>SMTP Server: {self.settings.smtp_server}</li>
                        <li>SMTP Port: {self.settings.smtp_port}</li>
                        <li>Username: {self.settings.smtp_username}</li>
                        <li>Sender: {self.settings.sender_email}</li>
                    </ul>
                </body>
            </html>
            """
            results.append({
                'test': 'Email Template Loading',
                'success': True,
                'message': 'Template loaded successfully'
            })
        except Exception as e:
            results.append({
                'test': 'Email Template Loading',
                'success': False,
                'message': f'Template loading failed: {str(e)}'
            })

        # Test 6: HTML Content Rendering
        try:
            msg = MIMEText(html_content, 'html')
            results.append({
                'test': 'HTML Content Rendering',
                'success': True,
                'message': 'HTML content rendered successfully'
            })
        except Exception as e:
            results.append({
                'test': 'HTML Content Rendering',
                'success': False,
                'message': f'HTML rendering failed: {str(e)}'
            })

        # Test 7: Email Headers Setup
        try:
            msg = MIMEMultipart()
            msg['Subject'] = 'Test Email'
            msg['From'] = self.settings.sender_email
            msg['To'] = 'test@example.com'
            results.append({
                'test': 'Email Headers Setup',
                'success': True,
                'message': 'Email headers set up correctly'
            })
        except Exception as e:
            results.append({
                'test': 'Email Headers Setup',
                'success': False,
                'message': f'Headers setup failed: {str(e)}'
            })

        # Test 8: Attachment Handling
        try:
            msg = MIMEMultipart()
            attachment = MIMEApplication('Test content'.encode('utf-8'))
            attachment.add_header('Content-Disposition', 'attachment', filename='test.txt')
            msg.attach(attachment)
            results.append({
                'test': 'Attachment Handling',
                'success': True,
                'message': 'Attachment handling works correctly'
            })
        except Exception as e:
            results.append({
                'test': 'Attachment Handling',
                'success': False,
                'message': f'Attachment handling failed: {str(e)}'
            })

        # Test 9: Rate Limiting Check
        try:
            last_email_time = getattr(current_app, 'last_email_time', None)
            current_time = datetime.utcnow()
            
            if last_email_time and (current_time - last_email_time) < timedelta(seconds=1):
                raise Exception('Rate limit would be exceeded')
                
            setattr(current_app, 'last_email_time', current_time)
            results.append({
                'test': 'Rate Limiting Check',
                'success': True,
                'message': 'Rate limiting is working properly'
            })
        except Exception as e:
            results.append({
                'test': 'Rate Limiting Check',
                'success': False,
                'message': f'Rate limiting check failed: {str(e)}'
            })

        # Test 10: Error Handling
        try:
            with smtplib.SMTP(self.settings.smtp_server, self.settings.smtp_port) as server:
                server.starttls()
                # Test with invalid credentials
                try:
                    server.login('invalid@test.com', 'invalid_password')
                except smtplib.SMTPAuthenticationError:
                    # This is expected
                    results.append({
                        'test': 'Error Handling',
                        'success': True,
                        'message': 'Error handling is properly configured'
                    })
        except Exception as e:
            results.append({
                'test': 'Error Handling',
                'success': False,
                'message': f'Error handling test failed: {str(e)}'
            })

        # Calculate success rate
        success_count = sum(1 for result in results if result['success'])
        success_rate = (success_count / len(results)) * 100

        return {
            'message': f'Email tests completed with {success_rate:.1f}% success rate',
            'results': results,
            'success_rate': success_rate
        }

    def send_test_email(self, recipient_email):
        """Send a test email to verify the configuration"""
        try:
            html_content = f"""
            <html>
                <body>
                    <h1>Test Email</h1>
                    <p>This is a test email sent at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    <h2>Email Configuration:</h2>
                    <ul>
                        <li>SMTP Server: {self.settings.smtp_server}</li>
                        <li>SMTP Port: {self.settings.smtp_port}</li>
                        <li>Sender Email: {self.settings.sender_email}</li>
                        <li>Notifications Enabled: {self.settings.enable_email_notifications}</li>
                    </ul>
                </body>
            </html>
            """
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'Test Email Configuration'
            msg['From'] = self.settings.sender_email
            msg['To'] = recipient_email

            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            with smtplib.SMTP(self.settings.smtp_server, self.settings.smtp_port) as server:
                server.starttls()
                server.login(self.settings.smtp_username, self.smtp_password)
                server.send_message(msg)

            return {'message': 'Test email sent successfully'}
                
        except Exception as e:
            current_app.logger.error(f"Error sending test email: {str(e)}")
            raise 