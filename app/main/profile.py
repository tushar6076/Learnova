import logging
from flask import jsonify, request, redirect, render_template, url_for, flash, current_app
from flask_login import logout_user, login_required, current_user
from app.main import main
from app.extensions import db
from app.models import User, UserDetails, Reviews
# from app.utils import run_async_email
from app.services.email import (
    send_password_reset_success_email, send_delete_account_success_email, send_support_assurance_email
)
from werkzeug.utils import secure_filename
import os
import json
# import threading

logger = logging.getLogger(__name__)

# --- User Profile & Dashboard ---
@main.route('/profile', methods=['GET'])
@login_required
def get_user_profile():
    details = current_user.details
    
    # Calculate Completion Progress
    all_columns = details.__table__.columns.keys()
    excluded = ['id', 'user_id', 'photo', 'selected_subjects', 'course_id']
    tracked_fields = [c for c in all_columns if c not in excluded]

    # Use a generator expression for a cleaner count
    filled_count = sum(1 for f in tracked_fields 
                       if getattr(details, f) and str(getattr(details, f)).lower() not in ['none', 'undefined', ''])

    # Add photo & subjects to the count
    if details.photo and 'default' not in str(details.photo).lower():
        filled_count += 1
    if details.selected_subjects and len(details.selected_subjects) > 0:
        filled_count += 1
    
    total_trackable = len(tracked_fields) + 2
    progress_percent = int((filled_count / total_trackable) * 100)

    # To be honest, passing a 'stats' dict helps the 'profile.js' we talked about earlier
    return render_template('profile.html', user=current_user, details=details, progress=progress_percent)


@main.route('/update_avatar', methods=['POST'])
@login_required
def update_avatar():
    if 'avatar' not in request.files:
        return jsonify({"status": "error", "message": "No file part"}), 400
    
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file"}), 400

    try:
        details = UserDetails.query.filter_by(user_id=current_user.user_id).first()
        
        # 1. Define paths
        old_photo = details.photo
        ext = file.filename.rsplit('.', 1)[1].lower()
        new_filename = f"user_{current_user.user_id}_{secure_filename(ext)}"
        upload_path = current_app.config['PROFILE_IMAGE_FOLDER']
        
        # 2. Save the new file first
        file.save(os.path.join(upload_path, new_filename))
        # 3. Delete old photo if it's not the default AND it exists on disk
        if old_photo and old_photo != 'default-avatar.png': # default photo
            old_path = os.path.join(upload_path, old_photo)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception as e:
                    current_app.logger.warning(f"Could not delete old photo: {e}")

        # 4. Update Database
        details.photo = new_filename
        db.session.commit()
        
        return jsonify({"status": "success", "filename": new_filename}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@main.route('/update', methods=['POST'])
@login_required
def update_user_details():
    data = request.form

    profile = UserDetails.query.filter_by(user_id=current_user.user_id).first()
    
    try:
        profile.name = data.get('name')
        profile.age = data.get('age')
        profile.gender = data.get('gender')
        # profile.academic_level = data.get('level')  # 'school' or 'college'
        profile.academic_context = data.get('context') # 'CBSE' or 'B.Tech CSE'
        profile.branch = data.get('branch')
        profile.grade_level = data.get('grade')

        # Handle JSON Subjects
        subjects_raw = data.get('subjects')
        if subjects_raw:
            current_app.logger.info(f"Received subjects JSON: {subjects_raw}")  # Debug log
            profile.selected_subjects = json.loads(subjects_raw)

        
        profile.course_id = data.get('course_id')

        db.session.commit()

        return jsonify({"status": "success"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Updation error: {e}")
        return jsonify({"status": "error", "message": "Server error during updating details"}), 500


# --- Verification and Update for Password Reset from Profile ---
@main.route('/verify_password_for_reset', methods=['POST'])
@login_required
def verify_password_for_reset():
    """Verifies old password and updates to the new one directly from profile settings."""
    password = request.form.get('password')
    new_password = request.form.get('new_password')
    
    if current_user.check_password(password):
        try:
            current_user.set_password(new_password)
            db.session.commit()

            # app = current_app._get_current_object()
            # threading.Thread(target=run_async_email, args=(app, send_password_reset_success_email, current_user.email, current_user.user_id)).start()

            send_password_reset_success_email.submit(current_user.email, current_user.user_id)

            return jsonify({"status": "success", "message": "Password updated successfully!"}), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"Password update error: {e}")
            return jsonify({"status": "error", "message": "Database error occurred."}), 500
    
    return jsonify({"status": "error", "message": "Incorrect current password."}), 401


# --- Logout ---
@main.route('/logout') 
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('home.index'))


# --- Account Deletion ---
@main.route('/delete_account', methods=['POST'])
@login_required
def delete_account():
    # 1. CAPTURE data before the user object is destroyed
    user = User.query.get(current_user.user_id)
    target_email = user.email
    target_user_id = user.user_id
    photo_to_delete = user.details.photo if user.details else None

    try:
        # 2. PERFORM DELETION FIRST
        # Logout to clear the session state
        logout_user()
        
        # Delete from DB
        db.session.delete(user)
        db.session.commit() # From this point on, the user is gone from the DB

        # 3. CLEAN UP FILES (Post-Commit)
        if photo_to_delete and photo_to_delete != 'default-avatar.png':
            path = os.path.join(current_app.config['PROFILE_IMAGE_FOLDER'], photo_to_delete)
            if os.path.exists(path):
                os.remove(path)

        # 4. SEND EMAIL (The very last step)
        # app = current_app._get_current_object()
        # We use the cached 'target_email' and 'target_user_id'
        # threading.Thread(target=run_async_email, args=(app, send_delete_account_success_email, target_email, target_user_id)).start()

        send_delete_account_success_email.submit(target_email, target_user_id)

        return jsonify({
            "status": "success", 
            "message": "Account successfully wiped. Goodbye!", 
            "redirect": url_for('home.show_login_dialog')
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Critical error during account deletion for {target_email}: {e}")
        return jsonify({"status": "error", "message": "Could not complete deletion."}), 500
    

@main.route('/submit_support_ticket', methods=['POST'])
# REMOVED: @login_required 
def submit_support_ticket():
    data = request.get_json()
    
    # Logic: Use the email from JSON (signup flow) OR current_user (logged in flow)
    email = data.get('email')
    if not email and current_user.is_authenticated:
        email = current_user.email
        
    issue_type = data.get('issue_type')
    details = data.get('details')
    
    # Fallback for user_id if not logged in
    u_id = current_user.user_id if current_user.is_authenticated else None
    
    current_app.logger.info(f"DEBUG: {email}, {issue_type}, {details}") # This will print now!
    
    try:
        review = Reviews(
            user_id = u_id,
            email = email,
            issue_type = issue_type,
            issue_details = details
        )
        db.session.add(review)
        db.session.commit()

        # Submit email to executor
        # Using placeholder 'New User' if u_id is None
        username = current_user.details.name if current_user.is_authenticated else "New Learner"
        send_support_assurance_email.submit(email, username, issue_type, details)

        return jsonify({"status": "success", "message": "Issue reported successfully!"}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Help Center error: {e}")
        return jsonify({"status": "error", "message": "Server error. Please try again."}), 500