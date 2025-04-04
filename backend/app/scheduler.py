from datetime import datetime, timezone
from app.models import User, Property, Ticket, Task, ServiceRequest, EmailSettings
from app.services.email_service import EmailService
from app.extensions import db
import logging
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# Global scheduler instance
scheduler = None

def init_scheduler():
    """Initialize the scheduler with default settings"""
    global scheduler
    try:
        scheduler = BackgroundScheduler(timezone=pytz.timezone('America/New_York'))
        
        # Get settings from database or use defaults
        settings = EmailSettings.query.first()
        if settings and settings.enable_daily_reports:
            scheduler.add_job(
                send_daily_reports,
                trigger=CronTrigger(
                    hour=settings.daily_report_hour,
                    minute=settings.daily_report_minute,
                    timezone=settings.daily_report_timezone
                ),
                id='daily_reports',
                name='Send daily property reports',
                replace_existing=True,
                misfire_grace_time=3600  # Allow job to run up to 1 hour late if server was down
            )
        
        scheduler.start()
        logging.info("Scheduler started successfully")
        if settings and settings.enable_daily_reports:
            logging.info("Next daily report run time: %s", 
                scheduler.get_job('daily_reports').next_run_time.strftime("%Y-%m-%d %H:%M:%S %Z"))
            
    except Exception as e:
        logging.error(f"Failed to initialize scheduler: {str(e)}")
        raise

def update_daily_report_schedule(hour=18, minute=0, timezone='America/New_York', enabled=True):
    """Update the daily report schedule"""
    global scheduler
    try:
        if not scheduler:
            logging.error("Scheduler not initialized")
            return

        if enabled:
            # Add or update the job
            scheduler.add_job(
                send_daily_reports,
                trigger=CronTrigger(
                    hour=hour,
                    minute=minute,
                    timezone=timezone
                ),
                id='daily_reports',
                name='Send daily property reports',
                replace_existing=True,
                misfire_grace_time=3600
            )
            logging.info("Daily report schedule updated. Next run time: %s",
                scheduler.get_job('daily_reports').next_run_time.strftime("%Y-%m-%d %H:%M:%S %Z"))
        else:
            # Remove the job if it exists
            if scheduler.get_job('daily_reports'):
                scheduler.remove_job('daily_reports')
                logging.info("Daily report schedule disabled")

    except Exception as e:
        logging.error(f"Failed to update daily report schedule: {str(e)}")
        raise

def has_activity(report_data):
    """Check if there is any activity to report"""
    return (len(report_data['open_tickets']) > 0 or
            len(report_data['closed_tickets_today']) > 0 or
            len(report_data['open_tasks']) > 0 or
            len(report_data['closed_tasks_today']) > 0 or
            len(report_data['open_service_requests']) > 0 or
            len(report_data['completed_service_requests_today']) > 0)

def get_daily_property_report(property_id):
    today = datetime.now(timezone.utc).date()
    
    # Get property details
    property = Property.query.get_or_404(property_id)
    
    # Get all tickets for this property
    tickets = Ticket.query.filter(
        Ticket.property_id == property_id,
        db.or_(
            # Get open tickets
            Ticket.status != 'completed',
            # Get tickets that were closed today
            db.and_(
                Ticket.status == 'completed',
                db.func.date(Ticket.updated_at) == today
            )
        )
    ).all()

    # Get all tasks
    tasks = Task.query.filter(
        Task.property_id == property_id,
        db.or_(
            # Get open tasks
            Task.status != 'completed',
            # Get tasks that were completed today
            db.and_(
                Task.status == 'completed',
                db.func.date(Task.updated_at) == today
            )
        )
    ).all()

    # Get all service requests
    service_requests = ServiceRequest.query.filter(
        ServiceRequest.property_id == property_id,
        db.or_(
            # Get open service requests
            ServiceRequest.status != 'completed',
            # Get service requests that were completed today
            db.and_(
                ServiceRequest.status == 'completed',
                db.func.date(ServiceRequest.created_at) == today  # Using created_at instead of updated_at
            )
        )
    ).all()

    # Organize data
    report_data = {
        'property_name': property.name,
        'open_tickets': [ticket.to_dict() for ticket in tickets if ticket.status != 'completed'],
        'closed_tickets_today': [ticket.to_dict() for ticket in tickets if ticket.status == 'completed' and ticket.updated_at.date() == today],
        'open_tasks': [task.to_dict() for task in tasks if task.status != 'completed'],
        'closed_tasks_today': [task.to_dict() for task in tasks if task.status == 'completed' and task.updated_at.date() == today],
        'open_service_requests': [{
            'title': sr.request_type,  # Use request_type as title
            'priority': sr.priority,
            'status': sr.status,
            'category': sr.request_group,  # Use request_group as category
            'room_name': sr.room.name if sr.room else 'N/A'
        } for sr in service_requests if sr.status != 'completed'],
        'completed_service_requests_today': [{
            'title': sr.request_type,  # Use request_type as title
            'priority': sr.priority,
            'status': sr.status,
            'category': sr.request_group,  # Use request_group as category
            'room_name': sr.room.name if sr.room else 'N/A'
        } for sr in service_requests if sr.status == 'completed' and sr.created_at.date() == today]
    }

    return report_data

def send_daily_reports():
    """Send daily reports to executive users for their assigned properties"""
    try:
        # Get current time in Eastern Time
        et_timezone = pytz.timezone('America/New_York')
        current_time = datetime.now(et_timezone)
        
        # Get all active executive users
        executive_users = User.query.filter_by(is_active=True, group='Executive').all()
        logging.info(f"Sending daily reports to {len(executive_users)} executive users")
        
        email_service = EmailService()
        
        for user in executive_users:
            try:
                # Get all properties assigned to this user using the relationship
                user_properties = user.assigned_properties.all()
                
                if not user_properties:
                    continue
                
                # Generate reports for each property
                property_reports = []
                for property in user_properties:
                    report_data = get_daily_property_report(property.property_id)
                    if has_activity(report_data):
                        property_reports.append(report_data)
                
                if not property_reports:
                    continue
                
                # Create HTML email template
                html_template = """
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .header {{ background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }}
                        .section {{ margin-bottom: 30px; }}
                        .section-title {{ color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
                        .item {{ margin: 10px 0; padding: 10px; background-color: #fff; border: 1px solid #eee; border-radius: 4px; }}
                        .critical {{ border-left: 4px solid #dc3545; }}
                        .high {{ border-left: 4px solid #fd7e14; }}
                        .medium {{ border-left: 4px solid #ffc107; }}
                        .low {{ border-left: 4px solid #28a745; }}
                        .summary {{ background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }}
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>Daily Property Report - {current_time}</h2>
                    </div>
                    
                    <div class="summary">
                        <h3>Summary</h3>
                        <p>Total Properties with Activity: {total_properties}</p>
                        <p>Total Open Tickets: {total_open_tickets}</p>
                        <p>Total Open Tasks: {total_open_tasks}</p>
                        <p>Total Open Service Requests: {total_open_sr}</p>
                    </div>
                    
                    {property_reports}
                </body>
                </html>
                """
                
                # Calculate summary statistics
                total_open_tickets = sum(len(r['open_tickets']) for r in property_reports)
                total_open_tasks = sum(len(r['open_tasks']) for r in property_reports)
                total_open_sr = sum(len(r['open_service_requests']) for r in property_reports)
                
                # Generate property reports HTML
                property_reports_html = ""
                for report in property_reports:
                    property_reports_html += f"""
                    <div class="section">
                        <h3 class="section-title">{report['property_name']}</h3>
                        
                        <h4>Open Tickets ({len(report['open_tickets'])})</h4>
                        {''.join(f'''
                        <div class="item {ticket['priority'].lower()}">
                            <strong>{ticket['title']}</strong><br>
                            Priority: {ticket['priority']}<br>
                            Category: {ticket['category']}<br>
                            Status: {ticket['status']}
                        </div>
                        ''' for ticket in report['open_tickets'])}
                        
                        <h4>Open Tasks ({len(report['open_tasks'])})</h4>
                        {''.join(f'''
                        <div class="item {task['priority'].lower()}">
                            <strong>{task['title']}</strong><br>
                            Priority: {task['priority']}<br>
                            Status: {task['status']}
                        </div>
                        ''' for task in report['open_tasks'])}
                        
                        <h4>Open Service Requests ({len(report['open_service_requests'])})</h4>
                        {''.join(f'''
                        <div class="item {sr['priority'].lower()}">
                            <strong>{sr['title']}</strong><br>
                            Priority: {sr['priority']}<br>
                            Status: {sr['status']}<br>
                            Room: {sr['room_name']}
                        </div>
                        ''' for sr in report['open_service_requests'])}
                    </div>
                    """
                
                # Format the email content
                html_content = html_template.format(
                    current_time=current_time.strftime("%B %d, %Y %I:%M %p ET"),
                    total_properties=len(property_reports),
                    total_open_tickets=total_open_tickets,
                    total_open_tasks=total_open_tasks,
                    total_open_sr=total_open_sr,
                    property_reports=property_reports_html
                )
                
                # Send the email
                email_service.send_email(
                    recipient_email=user.email,
                    subject=f"Daily Property Report - {current_time.strftime('%B %d, %Y')}",
                    html_content=html_content
                )
                
                logging.info(f"Sent daily report to {user.email}")
                
            except Exception as e:
                logging.error(f"Error sending report to user {user.email}: {str(e)}")
                continue
                
    except Exception as e:
        logging.error(f"Error in send_daily_reports: {str(e)}") 