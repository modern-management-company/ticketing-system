from datetime import datetime, timezone
from app.models import User, Property, Ticket, Task, ServiceRequest, EmailSettings
from app.services.email_service import EmailService
from app.extensions import db
import logging
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# HTML helper functions for email template generation
def build_open_ticket_html(ticket):
    return f"""
    <div class="item {ticket['priority'].lower()}">
        <div class="flex-row">
            <strong>{ticket['title']}</strong>
            <span class="badge {ticket['priority'].lower()}">{ticket['priority']}</span>
        </div>
        <div>Category: {ticket['category']}</div>
        <div>Status: {ticket['status']}</div>
    </div>
    """

def build_open_task_html(task):
    return f"""
    <div class="item {task['priority'].lower()}">
        <div class="flex-row">
            <strong>{task['title']}</strong>
            <span class="badge {task['priority'].lower()}">{task['priority']}</span>
        </div>
        <div>Status: {task['status']}</div>
    </div>
    """

def build_open_service_request_html(sr):
    return f"""
    <div class="item {sr['priority'].lower()}">
        <div class="flex-row">
            <strong>{sr['title']}</strong>
            <span class="badge {sr['priority'].lower()}">{sr['priority']}</span>
        </div>
        <div>Room: {sr['room_name']}</div>
        <div>Category: {sr['category']}</div>
        <div>Status: {sr['status']}</div>
    </div>
    """

def build_closed_ticket_html(ticket):
    return f"""
    <div class="item {ticket['priority'].lower()}">
        <div class="flex-row">
            <strong>{ticket['title']}</strong>
            <span class="badge {ticket['priority'].lower()}">{ticket['priority']}</span>
        </div>
        <div>Category: {ticket['category']}</div>
        <div class="resolved-by">Resolved by: {ticket['resolved_by']}</div>
    </div>
    """

def build_closed_task_html(task):
    return f"""
    <div class="item {task['priority'].lower()}">
        <div class="flex-row">
            <strong>{task['title']}</strong>
            <span class="badge {task['priority'].lower()}">{task['priority']}</span>
        </div>
        <div class="resolved-by">Completed by: {task['resolved_by']}</div>
    </div>
    """

def build_closed_service_request_html(sr):
    return f"""
    <div class="item {sr['priority'].lower()}">
        <div class="flex-row">
            <strong>{sr['title']}</strong>
            <span class="badge {sr['priority'].lower()}">{sr['priority']}</span>
        </div>
        <div>Room: {sr['room_name']}</div>
        <div>Category: {sr['category']}</div>
        <div class="resolved-by">Completed by: {sr.get('completed_by', 'Unassigned')}</div>
    </div>
    """

# Global scheduler instance
scheduler = None

def init_scheduler():
    """Initialize the scheduler with default settings"""
    global scheduler
    try:
        # If scheduler already exists and is running, don't recreate it
        if scheduler and scheduler.running:
            logging.info("Scheduler already running, skipping initialization")
            return

        # Create new scheduler with default timezone set to EST/EDT (America/New_York)
        scheduler = BackgroundScheduler(timezone=pytz.timezone('America/New_York'))
        
        # Get settings from database or use defaults
        settings = EmailSettings.query.first()
        
        if not settings:
            logging.warning("No email settings found in database, creating with default values")
            # Create default settings in database
            try:
                settings = EmailSettings(
                    smtp_server='',
                    smtp_port=587,
                    smtp_username='',
                    smtp_password='',
                    sender_email='',
                    enable_email_notifications=True,
                    daily_report_hour=18,  # 6 PM
                    daily_report_minute=0,
                    daily_report_timezone='America/New_York',
                    enable_daily_reports=True
                )
                db.session.add(settings)
                db.session.commit()
                logging.info("Created default email settings in database")
            except Exception as e:
                logging.error(f"Failed to create default email settings: {str(e)}")
                db.session.rollback()
                # Continue with settings object but don't save to DB
                settings = EmailSettings(
                    daily_report_hour=18,
                    daily_report_minute=0,
                    daily_report_timezone='America/New_York',
                    enable_daily_reports=True
                )
        
        # Always add the daily reports job, but only enable it if configured
        if settings.enable_daily_reports:
            # Add the daily report job to run at configured time (default 6pm EST)
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
            logging.info(f"Added daily report job to run at {settings.daily_report_hour}:{settings.daily_report_minute:02d} {settings.daily_report_timezone}")
        else:
            logging.info("Daily reports are disabled in settings")
        
        # Start the scheduler
        scheduler.start()
        logging.info("✅ Scheduler started successfully")
        
        # Log the next run time if reports are enabled
        if settings.enable_daily_reports:
            daily_job = scheduler.get_job('daily_reports')
            if daily_job and daily_job.next_run_time:
                logging.info("📅 Next daily report run time: %s", 
                    daily_job.next_run_time.strftime("%Y-%m-%d %H:%M:%S %Z"))
            else:
                logging.warning("Daily report job exists but next run time could not be determined")
            
    except Exception as e:
        logging.error(f"Failed to initialize scheduler: {str(e)}")
        # Try to recover by creating a minimal scheduler with just the daily report
        try:
            if not scheduler or not scheduler.running:
                scheduler = BackgroundScheduler(timezone=pytz.timezone('America/New_York'))
                scheduler.add_job(
                    send_daily_reports, 
                    trigger=CronTrigger(hour=18, minute=0),
                    id='daily_reports',
                    name='Send daily property reports (fallback)',
                    replace_existing=True
                )
                scheduler.start()
                logging.info("⚠️ Started scheduler in recovery mode with default settings (6 PM EST)")
            return
        except Exception as recovery_error:
            logging.error(f"Failed to recover scheduler: {str(recovery_error)}")
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

    # Organize data - include resolver information for completed items
    report_data = {
        'property_name': property.name,
        'open_tickets': [ticket.to_dict() for ticket in tickets if ticket.status != 'completed'],
        'closed_tickets_today': [{
            **ticket.to_dict(),
            'resolved_by': ticket.assigned_user.name if ticket.assigned_user else 'Unassigned'
        } for ticket in tickets if ticket.status == 'completed' and ticket.updated_at.date() == today],
        'open_tasks': [task.to_dict() for task in tasks if task.status != 'completed'],
        'closed_tasks_today': [{
            **task.to_dict(),
            'resolved_by': task.assigned_user.name if task.assigned_user else 'Unassigned'
        } for task in tasks if task.status == 'completed' and task.updated_at.date() == today],
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
            'room_name': sr.room.name if sr.room else 'N/A',
            'completed_by': sr.assigned_user.name if hasattr(sr, 'assigned_user') and sr.assigned_user else 'Unassigned'
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
                
                # Create HTML email template - Enhanced for executives
                html_template = """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9; }
                        .container { max-width: 900px; margin: 0 auto; background-color: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                        .header { background-color: #3a5a78; color: white; padding: 20px; text-align: center; }
                        .summary-card { background-color: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 20px; margin: 20px; }
                        .property-section { margin: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
                        .property-header { background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
                        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
                        .metric-box { background-color: #f8f9fa; border-radius: 6px; padding: 15px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
                        .metric-value { font-size: 24px; font-weight: bold; color: #3a5a78; margin: 5px 0; }
                        .metric-label { font-size: 14px; color: #666; }
                        .item-list { margin-top: 10px; }
                        .item { background-color: white; border-radius: 6px; padding: 15px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                        .item.critical { border-left: 4px solid #dc3545; }
                        .item.high { border-left: 4px solid #fd7e14; }
                        .item.medium { border-left: 4px solid #ffc107; }
                        .item.low { border-left: 4px solid #28a745; }
                        .tab-container { overflow: hidden; margin: 20px 0; }
                        .tab { overflow: hidden; background-color: #f1f1f1; border-radius: 6px 6px 0 0; }
                        .tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 14px 16px; transition: 0.3s; font-size: 16px; }
                        .tab button:hover { background-color: #ddd; }
                        .tab button.active { background-color: #3a5a78; color: white; }
                        .tabcontent { display: none; padding: 15px; border: 1px solid #ccc; border-top: none; border-radius: 0 0 6px 6px; }
                        .tabcontent.active { display: block; }
                        .resolved-by { font-style: italic; color: #6c757d; margin-top: 5px; }
                        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; background-color: #f9f9f9; }
                        .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
                        .badge.critical { background-color: #ffdddd; color: #dc3545; }
                        .badge.high { background-color: #fff3cd; color: #fd7e14; }
                        .badge.medium { background-color: #fff8dd; color: #ffc107; }
                        .badge.low { background-color: #d4edda; color: #28a745; }
                        .flex-row { display: flex; justify-content: space-between; align-items: center; }
                        h3, h4 { color: #3a5a78; }
                        .star-performer { background-color: #f0f7ff; border: 1px solid #cfe2ff; border-radius: 6px; padding: 10px; margin-top: 15px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Executive Daily Report</h1>
                            <h3>{current_time}</h3>
                        </div>
                        
                        <div class="summary-card">
                            <h2>Daily Summary</h2>
                            <div class="metrics-grid">
                                <div class="metric-box">
                                    <div class="metric-value">{total_properties}</div>
                                    <div class="metric-label">Properties with Activity</div>
                                </div>
                                <div class="metric-box">
                                    <div class="metric-value">{total_open_tickets}</div>
                                    <div class="metric-label">Open Tickets</div>
                                </div>
                                <div class="metric-box">
                                    <div class="metric-value">{total_closed_tickets}</div>
                                    <div class="metric-label">Tickets Closed Today</div>
                                </div>
                                <div class="metric-box">
                                    <div class="metric-value">{total_open_tasks}</div>
                                    <div class="metric-label">Open Tasks</div>
                                </div>
                                <div class="metric-box">
                                    <div class="metric-value">{total_closed_tasks}</div>
                                    <div class="metric-label">Tasks Completed Today</div>
                                </div>
                            </div>
                            
                            <div class="star-performer">
                                <h3>Top Performers Today</h3>
                                {top_performers_html}
                            </div>
                        </div>
                        
                        {property_reports}
                        
                        <div class="footer">
                            <p>This is an automated report. Please do not reply to this email.</p>
                            <p>© {current_year} Property Management System</p>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                # Calculate summary statistics
                total_open_tickets = sum(len(r['open_tickets']) for r in property_reports)
                total_closed_tickets = sum(len(r['closed_tickets_today']) for r in property_reports)
                total_open_tasks = sum(len(r['open_tasks']) for r in property_reports)
                total_closed_tasks = sum(len(r['closed_tasks_today']) for r in property_reports)
                total_open_sr = sum(len(r['open_service_requests']) for r in property_reports)
                total_completed_sr = sum(len(r['completed_service_requests_today']) for r in property_reports)
                
                # Calculate top performers
                top_performers = {}
                
                # Count closed tickets by resolver
                for report in property_reports:
                    for ticket in report['closed_tickets_today']:
                        resolver = ticket.get('resolved_by', 'Unassigned')
                        if resolver != 'Unassigned':
                            if resolver not in top_performers:
                                top_performers[resolver] = {'tickets': 0, 'tasks': 0}
                            top_performers[resolver]['tickets'] += 1
                    
                    # Count completed tasks by resolver
                    for task in report['closed_tasks_today']:
                        resolver = task.get('resolved_by', 'Unassigned')
                        if resolver != 'Unassigned':
                            if resolver not in top_performers:
                                top_performers[resolver] = {'tickets': 0, 'tasks': 0}
                            top_performers[resolver]['tasks'] += 1
                
                # Sort by total (tickets + tasks)
                sorted_performers = sorted(
                    top_performers.items(),
                    key=lambda x: (x[1]['tickets'] + x[1]['tasks']),
                    reverse=True
                )
                
                # Generate top performers HTML
                top_performers_html = ""
                if sorted_performers:
                    for i, (name, stats) in enumerate(sorted_performers[:3], 1):
                        top_performers_html += f"""
                        <p><strong>#{i} {name}</strong> - Resolved {stats['tickets']} tickets and completed {stats['tasks']} tasks</p>
                        """
                else:
                    top_performers_html = "<p>No tickets or tasks were completed today</p>"
                
                # Generate property reports HTML
                property_reports_html = ""
                for report in property_reports:
                    property_reports_html += f"""
                    <div class="property-section">
                        <div class="property-header">
                            <h2>{report['property_name']}</h2>
                            <div class="metrics-grid">
                                <div class="metric-box">
                                    <div class="metric-value">{len(report['open_tickets'])}</div>
                                    <div class="metric-label">Open Tickets</div>
                                </div>
                                <div class="metric-box">
                                    <div class="metric-value">{len(report['closed_tickets_today'])}</div>
                                    <div class="metric-label">Tickets Closed Today</div>
                                </div>
                                <div class="metric-box">
                                    <div class="metric-value">{len(report['open_tasks'])}</div>
                                    <div class="metric-label">Open Tasks</div>
                                </div>
                                <div class="metric-box">
                                    <div class="metric-value">{len(report['closed_tasks_today'])}</div>
                                    <div class="metric-label">Tasks Completed Today</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="tab-container">
                            <div class="tab">
                                <button class="tablinks active" onclick="openTab(event, 'Open{report['property_name'].replace(' ', '')}')" id="defaultOpen">Open Issues</button>
                                <button class="tablinks" onclick="openTab(event, 'Closed{report['property_name'].replace(' ', '')}')">Resolved Today</button>
                            </div>
                            
                            <div id="Open{report['property_name'].replace(' ', '')}" class="tabcontent active">
                                <h3>Open Tickets ({len(report['open_tickets'])})</h3>
                                <div class="item-list">
                                    {"".join([build_open_ticket_html(ticket) for ticket in report['open_tickets'][:5]]) if report['open_tickets'] else '<p>No open tickets</p>'}
                                    {f'<p><em>+ {len(report["open_tickets"]) - 5} more open tickets...</em></p>' if len(report['open_tickets']) > 5 else ''}
                                </div>
                                
                                <h3>Open Tasks ({len(report['open_tasks'])})</h3>
                                <div class="item-list">
                                    {"".join([build_open_task_html(task) for task in report['open_tasks'][:5]]) if report['open_tasks'] else '<p>No open tasks</p>'}
                                    {f'<p><em>+ {len(report["open_tasks"]) - 5} more open tasks...</em></p>' if len(report['open_tasks']) > 5 else ''}
                                </div>
                                
                                <h3>Open Service Requests ({len(report['open_service_requests'])})</h3>
                                <div class="item-list">
                                    {"".join([build_open_service_request_html(sr) for sr in report['open_service_requests'][:5]]) if report['open_service_requests'] else '<p>No open service requests</p>'}
                                    {f'<p><em>+ {len(report["open_service_requests"]) - 5} more open service requests...</em></p>' if len(report['open_service_requests']) > 5 else ''}
                                </div>
                            </div>
                            
                            <div id="Closed{report['property_name'].replace(' ', '')}" class="tabcontent">
                                <h3>Tickets Closed Today ({len(report['closed_tickets_today'])})</h3>
                                <div class="item-list">
                                    {"".join([build_closed_ticket_html(ticket) for ticket in report['closed_tickets_today']]) if report['closed_tickets_today'] else '<p>No tickets closed today</p>'}
                                </div>
                                
                                <h3>Tasks Completed Today ({len(report['closed_tasks_today'])})</h3>
                                <div class="item-list">
                                    {"".join([build_closed_task_html(task) for task in report['closed_tasks_today']]) if report['closed_tasks_today'] else '<p>No tasks completed today</p>'}
                                </div>
                                
                                <h3>Service Requests Completed Today ({len(report['completed_service_requests_today'])})</h3>
                                <div class="item-list">
                                    {"".join([build_closed_service_request_html(sr) for sr in report['completed_service_requests_today']]) if report['completed_service_requests_today'] else '<p>No service requests completed today</p>'}
                                </div>
                            </div>
                        </div>
                    </div>
                    """
                
                # Add JavaScript for tab functionality
                property_reports_html += """
                <script>
                function openTab(evt, tabName) {
                    var i, tabcontent, tablinks;
                    tabcontent = document.getElementsByClassName("tabcontent");
                    for (i = 0; i < tabcontent.length; i++) {
                        tabcontent[i].style.display = "none";
                        tabcontent[i].classList.remove("active");
                    }
                    tablinks = document.getElementsByClassName("tablinks");
                    for (i = 0; i < tablinks.length; i++) {
                        tablinks[i].className = tablinks[i].className.replace(" active", "");
                    }
                    document.getElementById(tabName).style.display = "block";
                    document.getElementById(tabName).classList.add("active");
                    evt.currentTarget.className += " active";
                }
                
                // Set default tab to be open on load
                document.addEventListener("DOMContentLoaded", function() {
                    var defaultOpen = document.getElementById("defaultOpen");
                    if(defaultOpen) {
                        defaultOpen.click();
                    }
                });
                </script>
                """
                
                # Format the email content
                html_content = html_template.format(
                    current_time=current_time.strftime("%B %d, %Y %I:%M %p ET"),
                    current_year=current_time.year,
                    total_properties=len(property_reports),
                    total_open_tickets=total_open_tickets,
                    total_closed_tickets=total_closed_tickets,
                    total_open_tasks=total_open_tasks,
                    total_closed_tasks=total_closed_tasks,
                    top_performers_html=top_performers_html,
                    property_reports=property_reports_html
                )
                
                # Send the email
                email_service.send_email(
                    recipient_email=user.email,
                    subject=f"Executive Daily Report - {current_time.strftime('%B %d, %Y')}",
                    html_content=html_content
                )
                
                logging.info(f"Sent daily report to {user.email}")
                
            except Exception as e:
                logging.error(f"Error sending report to user {user.email}: {str(e)}")
                continue
                
    except Exception as e:
        logging.error(f"Error in send_daily_reports: {str(e)}")

def verify_scheduler_settings():
    """Verify and update scheduler settings"""
    global scheduler
    
    try:
        settings = EmailSettings.query.first()
        if not settings:
            logging.warning("⚠️ No email settings found in database. Scheduler email functionality may not work.")
            return {"status": "warning", "message": "No email settings found in database"}

        # Verify email settings
        missing_settings = []
        if not settings.smtp_server:
            missing_settings.append("SMTP Server")
        if not settings.smtp_port:
            missing_settings.append("SMTP Port")
        if not settings.smtp_username:
            missing_settings.append("SMTP Username")
        if not settings.smtp_password:
            missing_settings.append("SMTP Password")
        
        if missing_settings:
            warning_msg = f"⚠️ Incomplete email settings: {', '.join(missing_settings)}. Daily reports may not be delivered."
            logging.warning(warning_msg)
            return {"status": "warning", "message": warning_msg}

        # Verify scheduler is initialized
        if not scheduler:
            logging.warning("⚠️ Scheduler not initialized. Initializing now...")
            init_scheduler()
            return {"status": "warning", "message": "Scheduler was not initialized and has been restarted"}

        # Verify scheduler is running
        if not scheduler.running:
            logging.warning("⚠️ Scheduler is not running. Starting scheduler...")
            scheduler.start()
            logging.info("✅ Scheduler started successfully")
            return {"status": "warning", "message": "Scheduler was not running and has been started"}

        # Verify daily report job exists and has correct settings
        daily_job = scheduler.get_job('daily_reports')
        
        if not daily_job and settings.enable_daily_reports:
            logging.warning("⚠️ Daily report job not scheduled. Adding job...")
            update_daily_report_schedule(
                hour=settings.daily_report_hour,
                minute=settings.daily_report_minute,
                timezone=settings.daily_report_timezone,
                enabled=settings.enable_daily_reports
            )
            daily_job = scheduler.get_job('daily_reports')
            if daily_job:
                logging.info("✅ Daily report job added successfully")
                return {"status": "success", "message": "Daily report job has been created", "next_run": daily_job.next_run_time.strftime("%Y-%m-%d %H:%M:%S %Z")}
            else:
                return {"status": "error", "message": "Failed to add daily report job"}
                
        elif daily_job and not settings.enable_daily_reports:
            logging.warning("⚠️ Daily reports are disabled in settings but job exists. Removing job...")
            scheduler.remove_job('daily_reports')
            return {"status": "success", "message": "Daily reports are disabled and the job has been removed"}
            
        elif daily_job:
            # Check if job settings match database settings
            job_trigger = daily_job.trigger
            settings_changed = False
            
            if hasattr(job_trigger, 'hour') and job_trigger.hour != settings.daily_report_hour:
                settings_changed = True
            elif hasattr(job_trigger, 'minute') and job_trigger.minute != settings.daily_report_minute:
                settings_changed = True
            elif hasattr(job_trigger, 'timezone') and str(job_trigger.timezone) != settings.daily_report_timezone:
                settings_changed = True
                
            if settings_changed:
                logging.info("⚠️ Daily report job settings don't match database. Updating...")
                update_daily_report_schedule(
                    hour=settings.daily_report_hour,
                    minute=settings.daily_report_minute,
                    timezone=settings.daily_report_timezone,
                    enabled=settings.enable_daily_reports
                )
                daily_job = scheduler.get_job('daily_reports')
                return {"status": "success", "message": "Daily report job settings have been updated", "next_run": daily_job.next_run_time.strftime("%Y-%m-%d %H:%M:%S %Z")}
            
            # Verify the next run time is as expected (should be at 6pm EST today or tomorrow)
            next_run = daily_job.next_run_time
            logging.info(f"✅ Next daily report scheduled for: {next_run.strftime('%Y-%m-%d %H:%M:%S %Z')}")
            return {"status": "success", "message": "Scheduler settings verified successfully", "next_run": next_run.strftime("%Y-%m-%d %H:%M:%S %Z")}
        else:
            return {"status": "success", "message": "Daily reports are disabled in settings and no job exists"}
            
    except Exception as e:
        error_msg = f"Error verifying scheduler settings: {str(e)}"
        logging.error(error_msg)
        return {"status": "error", "message": error_msg}