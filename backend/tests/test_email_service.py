import unittest
from unittest.mock import patch, MagicMock
from app import app, db
from app.models import EmailSettings
from app.email_service import EmailService
from app.email_test_service import EmailTestService
from flask_mail import Message
import os

class TestEmailService(unittest.TestCase):
    def setUp(self):
        """Set up test environment before each test"""
        self.app = app
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        
        # Configure test database
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
        
        # Create all tables
        db.create_all()
        
        # Create test email settings
        self.test_settings = EmailSettings(
            smtp_server='smtp.test.com',
            smtp_port=587,
            smtp_username='test@test.com',
            smtp_password='test_password',
            sender_email='sender@test.com',
            enable_email_notifications=True
        )
        db.session.add(self.test_settings)
        db.session.commit()

    def tearDown(self):
        """Clean up after each test"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    @patch('app.email_service.Mail')
    def test_email_service_initialization(self, mock_mail):
        """Test EmailService initialization and configuration loading"""
        email_service = EmailService()
        
        # Verify that Mail was initialized
        mock_mail.assert_called_once()
        
        # Verify configuration was loaded from database
        self.assertEqual(app.config['MAIL_SERVER'], 'smtp.test.com')
        self.assertEqual(app.config['MAIL_PORT'], 587)
        self.assertEqual(app.config['MAIL_USERNAME'], 'test@test.com')
        self.assertEqual(app.config['MAIL_USE_TLS'], True)
        self.assertEqual(app.config['MAIL_DEFAULT_SENDER'], 'sender@test.com')

    @patch('app.email_service.Mail')
    def test_send_email_success(self, mock_mail):
        """Test successful email sending"""
        email_service = EmailService()
        
        # Configure mock
        mock_mail_instance = mock_mail.return_value
        mock_mail_instance.send = MagicMock(return_value=None)
        
        # Test sending email
        result = email_service.send_email(
            to='recipient@test.com',
            subject='Test Subject',
            html_content='<p>Test Content</p>'
        )
        
        # Verify email was sent with correct parameters
        self.assertTrue(result)
        mock_mail_instance.send.assert_called_once()
        
        # Verify the Message object
        sent_message = mock_mail_instance.send.call_args[0][0]
        self.assertIsInstance(sent_message, Message)
        self.assertEqual(sent_message.subject, 'Test Subject')
        self.assertEqual(sent_message.recipients, ['recipient@test.com'])
        self.assertEqual(sent_message.html, '<p>Test Content</p>')

    @patch('app.email_service.Mail')
    def test_send_email_failure(self, mock_mail):
        """Test email sending failure"""
        email_service = EmailService()
        
        # Configure mock to raise an exception
        mock_mail_instance = mock_mail.return_value
        mock_mail_instance.send.side_effect = Exception('SMTP Error')
        
        # Test sending email
        result = email_service.send_email(
            to='recipient@test.com',
            subject='Test Subject',
            html_content='<p>Test Content</p>'
        )
        
        # Verify the failure was handled properly
        self.assertFalse(result)

    def test_email_notifications_disabled(self):
        """Test behavior when email notifications are disabled"""
        # Disable email notifications
        self.test_settings.enable_email_notifications = False
        db.session.commit()
        
        email_service = EmailService()
        
        # Test sending email
        result = email_service.send_email(
            to='recipient@test.com',
            subject='Test Subject',
            html_content='<p>Test Content</p>'
        )
        
        # Verify email was not sent
        self.assertFalse(result)

    @patch('app.email_service.Mail')
    def test_fallback_to_environment_variables(self, mock_mail):
        """Test fallback to environment variables when no settings in database"""
        # Remove settings from database
        db.session.delete(self.test_settings)
        db.session.commit()
        
        # Set environment variables
        os.environ['SMTP_SERVER'] = 'smtp.env.com'
        os.environ['SMTP_PORT'] = '587'
        os.environ['SMTP_USERNAME'] = 'env@test.com'
        os.environ['EMAIL_PASSWORD'] = 'env_password'
        os.environ['SENDER_EMAIL'] = 'env_sender@test.com'
        
        email_service = EmailService()
        
        # Verify fallback configuration
        self.assertEqual(app.config['MAIL_SERVER'], 'smtp.env.com')
        self.assertEqual(app.config['MAIL_PORT'], 587)
        self.assertEqual(app.config['MAIL_USERNAME'], 'env@test.com')
        self.assertEqual(app.config['MAIL_PASSWORD'], 'env_password')
        self.assertEqual(app.config['MAIL_DEFAULT_SENDER'], 'env_sender@test.com')

class TestEmailTestService(unittest.TestCase):
    def setUp(self):
        """Set up test environment before each test"""
        self.app = app
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Configure test database
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
        
        # Create all tables
        db.create_all()
        
        # Create test email settings
        self.test_settings = EmailSettings(
            smtp_server='smtp.test.com',
            smtp_port=587,
            smtp_username='test@test.com',
            smtp_password='test_password',
            sender_email='sender@test.com',
            enable_email_notifications=True
        )
        db.session.add(self.test_settings)
        db.session.commit()

    def tearDown(self):
        """Clean up after each test"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    @patch('app.email_test_service.smtplib.SMTP')
    def test_smtp_server_connection(self, mock_smtp):
        """Test SMTP server connection test"""
        email_test_service = EmailTestService()
        results = email_test_service.run_all_tests()
        
        # Verify SMTP connection test
        smtp_test = next(r for r in results['results'] if r['test'] == 'SMTP Server Connection')
        self.assertTrue(smtp_test['success'])
        mock_smtp.assert_called_with('smtp.test.com', 587)

    @patch('app.email_test_service.smtplib.SMTP')
    def test_smtp_authentication(self, mock_smtp):
        """Test SMTP authentication test"""
        mock_smtp_instance = mock_smtp.return_value
        email_test_service = EmailTestService()
        results = email_test_service.run_all_tests()
        
        # Verify authentication test
        auth_test = next(r for r in results['results'] if r['test'] == 'SMTP Authentication')
        self.assertTrue(auth_test['success'])
        mock_smtp_instance.login.assert_called_with('test@test.com', 'test_password')

    def test_sender_email_validation(self):
        """Test sender email validation"""
        email_test_service = EmailTestService()
        results = email_test_service.run_all_tests()
        
        # Verify email validation test
        validation_test = next(r for r in results['results'] if r['test'] == 'Sender Email Validation')
        self.assertTrue(validation_test['success'])

    @patch('app.email_test_service.EmailService')
    def test_send_test_email(self, mock_email_service):
        """Test sending test email"""
        mock_email_service_instance = mock_email_service.return_value
        mock_email_service_instance.send_email.return_value = True
        
        email_test_service = EmailTestService()
        result = email_test_service.send_test_email('test@example.com')
        
        # Verify test email was sent
        self.assertEqual(result['message'], 'Test email sent successfully')
        mock_email_service_instance.send_email.assert_called_once()

    def test_all_test_results(self):
        """Test that all 10 tests are run and results are properly formatted"""
        email_test_service = EmailTestService()
        results = email_test_service.run_all_tests()
        
        # Verify all tests are included
        self.assertEqual(len(results['results']), 10)
        self.assertIn('success_rate', results)
        self.assertIn('message', results)

if __name__ == '__main__':
    unittest.main() 