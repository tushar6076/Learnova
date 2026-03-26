from flask import current_app, request, render_template, abort, jsonify
from flask_login import login_required, current_user

from app.extensions import db
from app.models import User, Reviews

from app.services.ai import get_subject_names
from app.services.seeding import generate_and_seed
from app.services.email import send_course_fetched_email

from . import admin


@admin.route('/get_subjects', methods=['POST'])
@login_required
def get_subjects():
    data = request.get_json()
    # Call our wrapper from ai/__init__.py
    subject_names = get_subject_names(
        course_level=data.get('course_level'),
        course_context=data.get('course_context'),
        branch_name=data.get('branch'),
        course_grade=data.get('grade')
    )
    # If subject_names is a list, jsonify returns it directly
    return jsonify(subject_names)

@admin.route('/dashboard/reviews', methods=['GET'])
@login_required
def view_reviews():
    # Security: Verify current_user is the admin
    admin_email = current_app.config.get('MAIL_ADMIN_ADDRESS')
    if current_user.email != admin_email:
        abort(403)

    # Fetch only unresolved reviews first (or all, sorted by status)
    all_reviews = db.session.query(Reviews, User).outerjoin(
        User, Reviews.user_id == User.user_id
    ).order_by(Reviews.timestamp.desc()).all()

    return render_template('reviews.html', reviews=all_reviews)

@admin.route('/dashboard/reviews/<int:review_id>', methods=['GET'])
@login_required
def get_review(review_id):
    if current_user.email != current_app.config.get('MAIL_ADMIN_ADDRESS'):
        abort(403)
        
    review = Reviews.query.get_or_404(review_id)
    return render_template('view_review.html', review=review)

@admin.route('/dashboard/reviews/resolve/<int:review_id>', methods=['POST'])
@login_required
def resolve_review(review_id):
    if current_user.email != current_app.config.get('MAIL_ADMIN_ADDRESS'):
        abort(403)
        
    review = Reviews.query.get_or_404(review_id)
    review.is_resolved = True # You'll need to add this column to the model
    db.session.commit()
    
    return jsonify({"status": "success", "message": "Ticket marked as resolved"})


@admin.route('/reviews/<int:review_id>/resolve_issue/add_course', methods=['POST'])
@login_required
def add_course(review_id):
    if current_user.email != current_app.config.get('MAIL_ADMIN_ADDRESS'):
        abort(403)

    review = Reviews.query.get_or_404(review_id)
    data = request.get_json()
    
    # 1. Extract Full Context
    course_id = data.get('course_id')
    course_level = data.get('level')     # 'school' or 'college'
    course_context = data.get('context') # 'CBSE' or 'B.Tech'
    branch_name = data.get('branch')     # 'CSE'
    course_grade = data.get('grade')     # 'YEAR 1'
    subject_names = data.get('subjects')
    
    # 2. Generate and Seed (Long AI Process)
    success = generate_and_seed(
        current_app._get_current_object(),
        course_id,
        course_level,
        course_context,
        branch_name,
        course_grade,
        subject_names
    )

    if success:
        # 3. Mark as resolved & Notify
        review.is_resolved = True
        db.session.commit()
        
        send_course_fetched_email.submit(
            recipient_email=review.email, 
            username = (review.author.details.name if review.author and review.author.details 
                else review.email.split('@')[0].capitalize()), 
            branch_name=branch_name,
            course_grade=course_grade,
            course_level=course_level,
            course_context=course_context
        )
            
        return jsonify({"status": "success", "message": f"{course_context} {course_grade} is now live!"})
    
    return jsonify({"status": "error", "message": "AI Generation failed."}), 500