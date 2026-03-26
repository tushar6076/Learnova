import logging
from flask import jsonify, request, redirect, render_template, url_for, flash
from flask_login import login_required, current_user
from app.learning import learn
from app.extensions import db
from app.models import Chapters, TestResult

logger = logging.getLogger(__name__)


@learn.route('/quizzes', defaults={'chapter_id': None})
@learn.route('/quizzes/<chapter_id>', methods=['GET'])
@login_required
def load_quizzes_page(chapter_id):
    # Pass details so we can access user's academic path and subjects
    details = current_user.details
    chapter_obj = None
    if chapter_id:
        chapter_obj = Chapters.query.get_or_404(chapter_id)
    # We pass these to the template so the 'Configure Quiz' form 
    # knows which subjects the user is actually enrolled in.
    return render_template('quiz_option.html', user=current_user, details=details, chapter=chapter_obj)


@learn.route('/quiz', methods=['GET'])
@login_required
def load_quiz():
    """Renders the quiz engine page."""
    # current_user.details is the relationship to UserDetails
    return render_template('quiz.html', user=current_user, details=current_user.details)


@learn.route('/result', methods=['POST'])
@login_required
def result():
    data = request.json
    
    # Safety: Use current_user.user_id (or whatever your PK is) 
    # instead of trusting the user_id sent from the browser.
    uid = current_user.user_id 
    
    # Store the test result
    test_result = TestResult(
        user_id=uid,
        chapter_id=data.get('chapter_id'),
        subject_id=data.get('subject_id'),
        score=data.get('score'),
        total_questions=data.get('total_questions'),
        difficulty_level=data.get('difficulty'),
        # timestamp=db.func.now() # Most likely handled by your model default
    )
    
    try:
        db.session.add(test_result)
        db.session.commit()
        return jsonify({"message": "Result saved successfully", "status": "success"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error saving result", "error": str(e)}), 500