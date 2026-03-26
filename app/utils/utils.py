import logging
from sqlalchemy import func

from app.extensions import db, executor
from app.models import TestResult, ChatMessage

from datetime import datetime, timezone
import secrets


logger = logging.getLogger(__name__)

# Helper function to generate a 6-digit numeric code
def generate_auth_code():
    return str(secrets.randbelow(900000) + 100000)
# --- Authentication & User Management ---

# def run_async_email(app, func, *args):
#     # This 'with' block is the bridge that lets the thread use Flask features
#     with app.app_context():
#         try:
#             func(*args)
#         except Exception as e:
#             # This is where your error was caught
#             app.logger.error(f"Async email error: {e}")

def format_time_ago(timestamp):
    if not timestamp:
        return "Unknown"
    
    # Ensure the timestamp from DB has UTC info if it's missing (rare but safe)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
        
    # Use the same timezone-aware method for 'now'
    now = datetime.now(timezone.utc)
    delta = now - timestamp
    
    seconds = delta.total_seconds()
    
    # Logic remains the same, but the math is now safe!
    if seconds < 0: return "Just now" # Handles slight clock drift
    if seconds < 60: return "Just now"
    if seconds < 3600: return f"{int(seconds // 60)}m ago"
    if seconds < 86400: return f"{int(seconds // 3600)}h ago"
    if seconds < 604800: return f"{int(seconds // 86400)}d ago"
    
    return timestamp.strftime('%b %d')

def get_user_activity_days(user_id):
    # Counts unique dates in the timestamp column
    return db.session.query(func.count(func.distinct(func.date(TestResult.timestamp))))\
             .filter_by(user_id=user_id).scalar() or 0

def get_global_user_stats(user_id): 
    # Aggregate data across all subjects
    global_data = db.session.query(
        func.count(TestResult.id).label('total_quizzes'),
        func.sum(TestResult.total_questions).label('total_questions_answered'),
        func.coalesce(func.avg(TestResult.percentage), 0).label('overall_avg_percentage'),
        # Count distinct subjects the user has interacted with
        func.count(TestResult.subject_id.distinct()).label('subjects_explored')
    ).filter_by(user_id=user_id).first()

    # Return a dictionary formatted for your evaluator
    return {
        'total_quizzes': global_data.total_quizzes or 0,
        'total_questions': int(global_data.total_questions_answered or 0),
        'avg_percentage': float(global_data.overall_avg_percentage or 0),
        'subjects_count': global_data.subjects_explored or 0,
        # You can even add custom logic here, like "Days Active"
        'days_active': get_user_activity_days(user_id) 
    }

def get_user_stats_for_subject(user_id, subject_id):
    # Query the DB for aggregates
    stats = db.session.query(
        func.count(TestResult.id).label('total_quizzes'),
        func.avg(TestResult.percentage).label('avg_percentage'),
        func.coalesce(func.max(TestResult.percentage), 0).label('high_percentage'),
        func.sum(TestResult.total_questions).label('total_questions')
    ).filter_by(user_id=user_id, subject_id=subject_id).first()

    # Convert to a dictionary for the evaluator
    return {
        'total_quizzes': stats.total_quizzes or 0,
        'avg_percentage': float(stats.avg_percentage or 0),
        'high_percentage': stats.high_percentage or 0,
        'total_questions': int(stats.total_questions or 0)
    }

def is_milestone_achieved(requirement, user_stats):
    """
    requirement: The dict from your JSON/Field (e.g., {'requirement_type': 'avg_percentage', 'requirement_value': 90})
    user_stats: A dict of the user's actual performance (e.g., {'avg_percentage': 92, 'quiz_count': 5})
    """
    req_type = requirement.get('requirement_type')
    req_value = requirement.get('requirement_value')
    
    # Get the user's actual value for this specific metric
    # .get() with a default of 0 ensures we don't crash if the stat is missing
    actual_value = user_stats.get(req_type, 0)

    # Comparison logic (usually 'greater than or equal to')
    return actual_value >= req_value


@executor.job
def save_chat_message(session_id, sender, content):
    """
    Background job to persist chat messages. 
    @executor.job automatically provides the app context.
    """
    try:
        new_msg = ChatMessage(
            session_id=session_id, 
            sender=sender, 
            content=content
        )
        db.session.add(new_msg)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save {sender} message to DB: {e}")