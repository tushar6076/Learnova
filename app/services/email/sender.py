from flask import current_app, url_for
from flask_mail import Message
from datetime import datetime
import logging
from app.extensions import mail, executor
# Note: Assuming this module is created and contains HTML/Text templates
from .templates import (
    PASSWORD_RESET_SUCCESS_HTML_BODY, 
    WELCOME_HTML_BODY, LOGIN_ALERT_HTML_BODY, 
    PASSWORD_RESET_VERIFICATION_HTML_BODY,
    ACCOUNT_DELETED_HTML_BODY,
    SUPPORT_ASSURANCE_HTML_BODY,
    COURSE_FETCHED_HTML_BODY)

logger = logging.getLogger(__name__)

# This decorator tells Flask-Executor to automatically 
# provide the app context when this function runs in the background.
@executor.job
def send_welcome_email(recipient_email, username):
    """Sends a welcome email to the newly registered user."""
    # Getting the real app object for context-safe operations
    app = current_app._get_current_object()
    
    subject = "Welcome to Learnova! 🚀"
    sender = app.config.get('MAIL_DEFAULT_SENDER') or app.config.get('MAIL_SENDER')
    
    # We generate the link inside the app context
    dashboard_link = url_for('main.get_user_profile', _external=True) 

    html_body = WELCOME_HTML_BODY.format(
        username=username, 
        dashboard_url=dashboard_link
    )

    msg = Message(subject, sender=sender, recipients=[recipient_email])
    msg.html = html_body
    
    # Text fallback for accessibility
    msg.body = f"Hi {username}, welcome to Learnova! Visit your dashboard here: {dashboard_link}"
    
    try:
        # If using threads, you'd wrap this in 'with app.app_context():'
        mail.send(msg)
        logger.info(f"Welcome email dispatched to {recipient_email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email to {recipient_email}: {e}")

@executor.job
def send_login_alert(recipient_email, username):
    """Sends a security alert when a successful login occurs."""
    app = current_app._get_current_object()
    
    subject = "Security Alert: New Login Detected 🛡️"
    # Fallback to MAIL_DEFAULT_SENDER if MAIL_SENDER isn't set
    sender = app.config.get('MAIL_DEFAULT_SENDER') or app.config.get('MAIL_SENDER')
    
    # Use 'external=True' for email links
    # Pointing to forgot_password because reset_password usually needs a token/session
    reset_url = url_for('auth.forgot_password', _external=True) 

    try:
        html_body = LOGIN_ALERT_HTML_BODY.format(
            username=username, 
            email=recipient_email,
            time=datetime.now().strftime('%b %d, %Y at %I:%M %p'),
            reset_url=reset_url
        )

        msg = Message(subject, sender=sender, recipients=[recipient_email])
        msg.html = html_body
        
        # Text fallback
        msg.body = f"Hello {username}, a new login was detected on your account at {datetime.now().strftime('%I:%M %p')}. If this wasn't you, reset your password here: {reset_url}"

        mail.send(msg)
        logger.info(f"Security alert sent to {recipient_email}")
        
    except KeyError as e:
        logger.error(f"Template formatting error: Missing key {e}")
    except Exception as e:
        logger.error(f"Failed to send login alert to {recipient_email}: {e}")


@executor.job
def send_password_reset_code(recipient_email, username, code):
    """Sends a 6-digit verification code for password recovery."""
    app = current_app._get_current_object()

    subject = f"{code} is your Learnova verification code"
    sender = app.config.get('MAIL_DEFAULT_SENDER') or app.config.get('MAIL_SENDER')
    
    # Text-only fallback (Critical for OTPs)
    text_body = f"Hi {username}, your Learnova password reset code is: {code}. This code expires in 10 minutes."

    try:
        html_body = PASSWORD_RESET_VERIFICATION_HTML_BODY.format(
            username=username, 
            code=code
        )

        msg = Message(subject, sender=sender, recipients=[recipient_email])
        msg.html = html_body
        msg.body = text_body  # Fallback for simple email clients

        mail.send(msg)
        logger.info(f"OTP [{code}] successfully sent to {recipient_email}")
        
    except Exception as e:
        logger.error(f"Failed to send OTP to {recipient_email}: {e}")

@executor.job
def send_password_reset_success_email(recipient_email, username):
    """Sends a confirmation email after a successful password reset."""
    app = current_app._get_current_object()

    subject = "Security Update: Password Reset Successful ✅"
    # Using the safer .get() for the sender
    sender = app.config.get('MAIL_DEFAULT_SENDER') or app.config.get('MAIL_SENDER')
    
    # Format the HTML body
    html_body = PASSWORD_RESET_SUCCESS_HTML_BODY.format(username=username)

    # Plain text fallback for security-conscious clients
    text_body = f"Hi {username}, your Learnova password has been successfully reset. If you did not perform this action, please contact our support team immediately."

    msg = Message(subject, sender=sender, recipients=[recipient_email])
    msg.html = html_body
    msg.body = text_body
    
    try:
        mail.send(msg)
        logger.info(f"Password reset success notification sent to {recipient_email}")
    except Exception as e:
        # We log the error but don't crash the app, as the password is already changed
        logger.error(f"Failed to send reset success email to {recipient_email}: {e}")


@executor.job
def send_delete_account_success_email(recipient_email, username):
    """Sends a final confirmation email after an account is purged."""
    app = current_app._get_current_object()

    subject = "Confirmation: Your Learnova Account has been deleted"
    # Using the safer config key we set up earlier
    sender = app.config.get('MAIL_DEFAULT_SENDER') or app.config.get('MAIL_SENDER')
    
    # Text fallback
    text_body = f"Hello {username}, this email confirms that your Learnova account and all associated data have been successfully deleted. We are sorry to see you go!"

    try:
        html_body = ACCOUNT_DELETED_HTML_BODY.format(username=username)

        msg = Message(subject, sender=sender, recipients=[recipient_email])
        msg.html = html_body
        msg.body = text_body
        
        mail.send(msg)
        logger.info(f"Final goodbye sent to {recipient_email}")
        
    except Exception as e:
        # We log the error, but since the account is already deleted, 
        # there is no user record left to retry this for.
        logger.error(f"Failed to send deletion email to {recipient_email}: {e}")


@executor.job
def send_support_assurance_email(recipient_email, username, issue_type, issue_details):
    """Sends confirmation to user and notification to Admin with Reply-To header."""
    app = current_app._get_current_object()
    
    # 1. Setup basic info
    sender = app.config.get('MAIL_DEFAULT_SENDER')
    admin_email = app.config.get('MAIL_ADMIN_ADDRESS') # Ensure this is in your config
    
    # --- EMAIL A: FOR THE USER (The "Pretty" Confirmation) ---
    user_subject = f"Learnova Support: Ticket Received ({issue_type})"
    user_text = f"Hello {username},\n\nWe've received your report regarding '{issue_type}'. Details: {issue_details}. Our team will get back to you soon."
    
    try:
        user_html = SUPPORT_ASSURANCE_HTML_BODY.format(
            username=username, 
            issue_type=issue_type, 
            issue_details=issue_details
        )
        
        user_msg = Message(user_subject, sender=sender, recipients=[recipient_email])
        user_msg.html = user_html
        user_msg.body = user_text
        
        # --- EMAIL B: FOR THE ADMIN (The "Actionable" Alert) ---
        admin_subject = f"NEW TICKET [{issue_type}] from {username}"
        admin_msg = Message(
            admin_subject,
            sender=sender,
            recipients=[admin_email],
            reply_to=recipient_email  # This makes 'Reply' go to the user!
        )
        admin_msg.body = f"""
        New Support Request:
        -------------------
        User: {username} ({recipient_email})
        Type: {issue_type}
        
        Message:
        {issue_details}
        
        --
        End of Ticket.
        """

        # Send both emails
        mail.send(user_msg)
        mail.send(admin_msg)
        app.logger.info(f"Support cycle successful for {recipient_email}")

    except Exception as e:
        app.logger.error(f"Failed to complete support email cycle: {e}")


@executor.job
def send_course_fetched_email(recipient_email, username, branch_name, course_grade, course_level, course_context):
    """Sends a hyper-personalized notification when a requested course is ready."""
    app = current_app._get_current_object()
    
    # Subject: Your B.Tech - YEAR 1 (CSE) Course is Ready! 📚
    subject = f"Your {course_context} - {course_grade} ({branch_name}) is Ready! 🚀"
    sender = app.config.get('MAIL_DEFAULT_SENDER')
    
    courses_link = url_for('main.get_user_profile', _external=True)

    try:
        # Pass all architectural data to the template
        html_body = COURSE_FETCHED_HTML_BODY.format(
            username=username,
            level=course_level.capitalize(), # 'School' or 'College'
            context=course_context,           # 'CBSE' or 'B.Tech'
            grade=course_grade,               # 'STD 10' or 'YEAR 2'
            branch=branch_name,               # 'BIO' or 'CSE'
            dashboard_url=courses_link
        )

        msg = Message(subject, sender=sender, recipients=[recipient_email])
        msg.html = html_body
        
        # Text fallback
        msg.body = (f"Hi {username}, the {course_context} {course_grade} {branch_name} course "
                    f"you requested is now live on Learnova! View it here: {courses_link}")

        mail.send(msg)
        logger.info(f"Full-context email sent to {recipient_email} for {course_context}")
        
    except Exception as e:
        logger.error(f"Failed to send full-context email: {e}")