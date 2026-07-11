"""
Worker Activity Report Routes
Provides endpoints for generating property-level worker activity reports
"""
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
from app import app, db
from app.models import User, Task, Property, History
from app.decorators import token_required

@app.route('/api/reports/property-worker-activity', methods=['GET'])
@jwt_required()
def get_property_worker_activity():
    """
    Get worker activity aggregated by property
    
    Query Parameters:
    - property_id: (int) Optional - specific property ID
    - date_from: (str) YYYY-MM-DD format - start date for report
    - date_to: (str) YYYY-MM-DD format - end date for report
    - include_completed: (bool) Default: true - include completed tasks
    
    Returns:
    {
        "success": true,
        "properties": [
            {
                "property_id": 1,
                "property_name": "Downtown Hotel",
                "total_workers": 5,
                "total_tasks": 25,
                "workers": [
                    {
                        "worker_id": 10,
                        "worker_name": "John Doe",
                        "role": "staff",
                        "tasks_assigned": 8,
                        "tasks_completed": 6,
                        "tasks_in_progress": 2,
                        "tasks_pending": 0,
                        "total_hours_logged": 16.5,
                        "avg_hours_per_task": 2.75,
                        "completion_rate": 75,
                        "last_activity": "2026-07-11T14:30:00",
                        "performance_score": 85
                    },
                    ...
                ]
            },
            ...
        ]
    }
    """
    try:
        # Get parameters
        property_id = request.args.get('property_id', type=int)
        date_from_str = request.args.get('date_from')
        date_to_str = request.args.get('date_to')
        include_completed = request.args.get('include_completed', 'true').lower() == 'true'
        
        # Get current user identity
        current_user = get_jwt_identity()
        user_role = current_user.get('role')
        user_id = current_user.get('user_id')
        
        # Parse dates
        try:
            date_from = datetime.strptime(date_from_str, '%Y-%m-%d') if date_from_str else datetime.now() - timedelta(days=30)
            date_to = datetime.strptime(date_to_str, '%Y-%m-%d') if date_to_str else datetime.now()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Extend date_to to include the entire day
        date_to = date_to.replace(hour=23, minute=59, second=59)
        
        # Build property query
        if property_id:
            properties = Property.query.filter_by(property_id=property_id, status='active').all()
        else:
            # Managers/admins see all properties; staff see only assigned properties
            if user_role in ['manager', 'general_manager', 'super_admin']:
                properties = Property.query.filter_by(status='active').all()
            else:
                current_user_obj = User.query.get(user_id)
                properties = current_user_obj.assigned_properties.filter_by(status='active').all()
        
        if not properties:
            return jsonify({'success': True, 'properties': []}), 200
        
        property_data = []
        
        for prop in properties:
            # Get all workers assigned to this property
            workers = db.session.query(User).join(
                User.assigned_properties
            ).filter(
                Property.property_id == prop.property_id,
                User.role.in_(['staff', 'manager'])  # Only workers/staff
            ).all()
            
            worker_activity_data = []
            total_tasks = 0
            
            for worker in workers:
                # Get tasks assigned to this worker for this property in date range
                tasks = Task.query.filter(
                    Task.assigned_to_id == worker.user_id,
                    Task.property_id == prop.property_id,
                    Task.created_at >= date_from,
                    Task.created_at <= date_to
                ).all()
                
                if not include_completed:
                    tasks = [t for t in tasks if t.status.lower() != 'completed']
                
                if not tasks:
                    continue
                
                # Calculate metrics
                tasks_completed = len([t for t in tasks if t.status.lower() == 'completed'])
                tasks_in_progress = len([t for t in tasks if t.status.lower() == 'in progress' or t.status.lower() == 'in_progress'])
                tasks_pending = len([t for t in tasks if t.status.lower() == 'pending'])
                tasks_assigned = len(tasks)
                
                # Calculate hours
                total_hours = sum([t.time_spent or 0 for t in tasks])
                avg_hours_per_task = total_hours / tasks_assigned if tasks_assigned > 0 else 0
                
                # Completion rate
                completion_rate = (tasks_completed / tasks_assigned * 100) if tasks_assigned > 0 else 0
                
                # Get last activity
                last_activity = None
                if tasks:
                    # Get the most recent task update
                    latest_task = max(tasks, key=lambda t: t.updated_at or t.created_at)
                    last_activity = (latest_task.updated_at or latest_task.created_at).isoformat()
                
                # Performance score (0-100)
                # Based on completion rate, hours logged, and task count
                base_score = completion_rate  # 0-100
                
                # Bonus for consistent work (tasks completed)
                task_bonus = min(20, tasks_completed * 2)
                
                # Deduction for pending tasks
                pending_penalty = min(15, tasks_pending * 3)
                
                performance_score = max(0, min(100, base_score + task_bonus - pending_penalty))
                
                worker_activity_data.append({
                    'worker_id': worker.user_id,
                    'worker_name': worker.username,
                    'email': worker.email,
                    'phone': worker.phone or 'N/A',
                    'role': worker.role,
                    'group': worker.group or 'Unassigned',
                    'tasks_assigned': tasks_assigned,
                    'tasks_completed': tasks_completed,
                    'tasks_in_progress': tasks_in_progress,
                    'tasks_pending': tasks_pending,
                    'total_hours_logged': round(total_hours, 2),
                    'avg_hours_per_task': round(avg_hours_per_task, 2),
                    'completion_rate': round(completion_rate, 1),
                    'last_activity': last_activity,
                    'performance_score': round(performance_score, 1)
                })
                
                total_tasks += tasks_assigned
            
            # Sort workers by performance score (descending)
            worker_activity_data.sort(key=lambda x: x['performance_score'], reverse=True)
            
            property_data.append({
                'property_id': prop.property_id,
                'property_name': prop.name,
                'property_code': prop.hotel_code,
                'total_workers': len(worker_activity_data),
                'total_tasks': total_tasks,
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
                'workers': worker_activity_data
            })
        
        return jsonify({
            'success': True,
            'properties': property_data,
            'total_properties': len(property_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch worker activity: {str(e)}'}), 500


@app.route('/api/reports/worker-detailed-activity/<int:worker_id>', methods=['GET'])
@jwt_required()
def get_worker_detailed_activity(worker_id):
    """
    Get detailed activity for a specific worker
    
    Query Parameters:
    - property_id: (int) Optional - filter by property
    - date_from: (str) YYYY-MM-DD format
    - date_to: (str) YYYY-MM-DD format
    
    Returns detailed task breakdown for a worker
    """
    try:
        property_id = request.args.get('property_id', type=int)
        date_from_str = request.args.get('date_from')
        date_to_str = request.args.get('date_to')
        
        # Parse dates
        try:
            date_from = datetime.strptime(date_from_str, '%Y-%m-%d') if date_from_str else datetime.now() - timedelta(days=30)
            date_to = datetime.strptime(date_to_str, '%Y-%m-%d') if date_to_str else datetime.now()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        date_to = date_to.replace(hour=23, minute=59, second=59)
        
        # Get worker
        worker = User.query.get(worker_id)
        if not worker:
            return jsonify({'error': 'Worker not found'}), 404
        
        # Build task query
        task_query = Task.query.filter(
            Task.assigned_to_id == worker_id,
            Task.created_at >= date_from,
            Task.created_at <= date_to
        )
        
        if property_id:
            task_query = task_query.filter(Task.property_id == property_id)
        
        tasks = task_query.all()
        
        # Get history for worker's tasks
        task_ids = [t.task_id for t in tasks]
        history = History.query.filter(
            History.entity_type == 'task',
            History.entity_id.in_(task_ids)
        ).order_by(History.created_at.desc()).all() if task_ids else []
        
        # Format response
        task_details = []
        for task in tasks:
            task_history = [h for h in history if h.entity_id == task.task_id]
            
            task_details.append({
                'task_id': task.task_id,
                'title': task.title,
                'description': task.description,
                'status': task.status,
                'priority': task.priority,
                'property_id': task.property_id,
                'created_at': task.created_at.isoformat(),
                'updated_at': task.updated_at.isoformat() if task.updated_at else None,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                'time_spent': task.time_spent or 0,
                'cost': task.cost or 0,
                'history_count': len(task_history)
            })
        
        return jsonify({
            'success': True,
            'worker_id': worker_id,
            'worker_name': worker.username,
            'email': worker.email,
            'total_tasks': len(tasks),
            'tasks': task_details
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch worker activity: {str(e)}'}), 500


@app.route('/api/reports/property-summary', methods=['GET'])
@jwt_required()
def get_property_summary():
    """
    Get summary statistics for all properties
    
    Returns high-level metrics for dashboard
    """
    try:
        date_from_str = request.args.get('date_from')
        date_to_str = request.args.get('date_to')
        
        # Parse dates
        try:
            date_from = datetime.strptime(date_from_str, '%Y-%m-%d') if date_from_str else datetime.now() - timedelta(days=30)
            date_to = datetime.strptime(date_to_str, '%Y-%m-%d') if date_to_str else datetime.now()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        date_to = date_to.replace(hour=23, minute=59, second=59)
        
        # Get current user
        current_user = get_jwt_identity()
        user_role = current_user.get('role')
        user_id = current_user.get('user_id')
        
        # Get properties based on role
        if user_role in ['manager', 'general_manager', 'super_admin']:
            properties = Property.query.filter_by(status='active').all()
        else:
            current_user_obj = User.query.get(user_id)
            properties = current_user_obj.assigned_properties.filter_by(status='active').all()
        
        # Calculate metrics
        total_tasks = Task.query.filter(
            Task.created_at >= date_from,
            Task.created_at <= date_to
        ).count()
        
        completed_tasks = Task.query.filter(
            Task.created_at >= date_from,
            Task.created_at <= date_to,
            Task.status.ilike('completed')
        ).count()
        
        total_workers = db.session.query(func.count(User.user_id.distinct())).filter(
            User.role.in_(['staff', 'manager']),
            User.is_active == True
        ).scalar()
        
        total_hours = db.session.query(func.sum(Task.time_spent)).filter(
            Task.created_at >= date_from,
            Task.created_at <= date_to
        ).scalar() or 0
        
        return jsonify({
            'success': True,
            'summary': {
                'total_properties': len(properties),
                'total_workers': total_workers,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'pending_tasks': total_tasks - completed_tasks,
                'completion_rate': round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
                'total_hours_logged': round(total_hours, 2),
                'avg_hours_per_task': round((total_hours / total_tasks) if total_tasks > 0 else 0, 2),
                'date_range': {
                    'from': date_from.isoformat(),
                    'to': date_to.isoformat()
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch property summary: {str(e)}'}), 500
