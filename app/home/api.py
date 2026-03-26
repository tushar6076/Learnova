import os
import json
import logging
from flask import jsonify, request, current_app
from flask_login import current_user, login_required

from app.home import home

from app.extensions import db
from app.models import User, Courses, Subjects, Chapters, TestResult
from app.utils import format_time_ago, get_global_user_stats, get_user_stats_for_subject, is_milestone_achieved

logger = logging.getLogger(__name__)


@home.route('/api/check-credentials', methods=['POST'])
def check_credentials():
    data = request.form
    user_id = data.get('userid')
    email = data.get('email')

    if User.query.filter((User.email == email)).first():
        return jsonify({"status": "error", "message": "Email already taken"}), 409
    
    if User.query.filter((User.user_id == user_id)).first():
        return jsonify({"status": "error", "message": "User ID already taken"}), 409
    
    return jsonify({"status": "success"}), 200


# Route: Serve the JSON data for AJAX (the 'api')
@home.route('/api/quiz-history', methods=['GET'])
@login_required
def get_quiz_history():
    # We join with Subject instead of Chapter to ensure 'Subject Name' always exists
    results = TestResult.query.filter_by(user_id=current_user.user_id)\
        .options(db.joinedload(TestResult.subject), db.joinedload(TestResult.chapter))\
        .order_by(TestResult.timestamp.asc()).all()
    
    data = []
    for r in results:
        data.append({
            'date': r.timestamp.strftime('%Y-%m-%d'),
            'subject': r.subject.subject_name,
            'chapter': r.chapter.title if r.chapter else "Full Subject Mix",
            'percentage': r.percentage,
            'difficulty': r.difficulty_level
        })
    return jsonify(data)


@home.route('/api/get_courses_hierarchy', methods=['GET'])
def get_courses_hierarchy():
    # Get all courses to build the selection tree
    courses = Courses.query.all()
    
    hierarchy = {}
    for c in courses:
        level = c.course_level # 'school'
        context = c.course_context # 'CBSE'
        branch = c.branch # 'BIO'
        grade = c.grade_level # 'STD 12'
        
        if level not in hierarchy:
            hierarchy[level] = {}
        if context not in hierarchy[level]:
            hierarchy[level][context] = {}
        if branch not in hierarchy[level][context]:
            hierarchy[level][context][branch] = {}

        hierarchy[level][context][branch][grade] = c.course_id
        
    return jsonify(hierarchy)


@home.route('/api/get_course_subjects/<course_id>', methods=['GET'])
def get_subjects(course_id):
    # Fetch all subjects belonging to the selected course
    subjects = Subjects.query.filter_by(course_id=course_id).all()
    
    # Convert to a list of dictionaries for JSON
    subject_list = [
        {"id": s.subject_id, "name": s.subject_name} 
        for s in subjects
    ]
    
    return jsonify(subject_list)


@home.route('/api/get_initial_academic_data/<course_id>', methods=['GET'])
@login_required
def get_initial_academic_data(course_id):
    # 1. Get the Course details
    course = Courses.query.get_or_404(course_id)
    
    # 2. Get all subjects for this course
    subjects = Subjects.query.filter_by(course_id=course_id).all()
    
    return jsonify({
        "level": course.course_level,
        "context": course.course_context,
        "branch": course.branch,
        "grade": course.grade_level,
        "selected_subjects": current_user.details.selected_subjects,
        "available_subjects": [{"id": s.subject_id, "name": s.subject_name} for s in subjects]
    })


@home.route('/api/get_user_curriculum', methods=['GET'])
@login_required
def get_user_curriculum():
    details = current_user.details
    if not details or not details.course_id:
        return jsonify([])

    # 1. Get only the subjects the user selected
    selected_ids = details.selected_subjects or []
    subjects = Subjects.query.filter(Subjects.subject_id.in_(selected_ids)).all()

    curriculum = []
    for s in subjects:
        # 2. Get chapters for each subject
        chapters = Chapters.query.filter_by(subject_id=s.subject_id).order_by(Chapters.order).all()
        
        curriculum.append({
            "subject_id": s.subject_id,
            "subject": s.subject_name,
            "icon": s.icon or "bi-book", # Fallback icon
            "chapters": [{
                "chapter_id": ch.chapter_id,
                "title": ch.title,
                "intro": ch.overview,
                "video": ch.video_stack,
                "pdf": ch.pdf_file_path
            } for ch in chapters]
        })
        
    return jsonify(curriculum)


@home.route('/api/generate_quiz', methods=['POST'])
@login_required
def generate_quiz():
    data = request.json
    chapter_id = data.get('chapterId')
    subject_id = data.get('subjectId')
    limit = int(data.get('questionCount', 10))
    diff = data.get('difficulty', 'medium')

    query = Chapters.query.filter_by(subject_id=subject_id)
    
    if chapter_id != None:
        query = query.filter_by(chapter_id=chapter_id)

    chapter = query.first()
    
    if not chapter or not chapter.quiz_data:
        return jsonify([])

    # Filter the JSONB list by difficulty and limit
    all_q = [q for q in chapter.quiz_data if q['difficulty'] == diff]
    
    import random
    random.shuffle(all_q)
    return jsonify(all_q[:limit])


@home.route('/api/user-achievements')
@login_required
def get_achievements():
    # This ensures the path is always relative to the 'app' directory
    json_path = os.path.join(current_app.root_path, 'static', 'assets', 'json', 'common_achievements.json')
    # Load Global Definitions
    try:
        with open(json_path, 'r') as f:
            global_definitions = json.load(f)
    except FileNotFoundError:
        current_app.logger.error(f"Achievement file not found at {json_path}")
        global_definitions=[]

    selected_ids = current_user.details.selected_subjects or []
    user_subjects = Subjects.query.filter(Subjects.subject_id.in_(selected_ids)).all()
    global_stats = get_global_user_stats(current_user.user_id)

    badges_list = []
    mastery_milestones_list = []
    mastery_progress = []

    # 1. Process GLOBAL "Badges"
    for b in global_definitions:
        b_copy = b.copy()
        b_copy['is_unlocked'] = is_milestone_achieved(b_copy, global_stats)
        badges_list.append(b_copy)

    # 2. Process SUBJECT "Mastery Milestones"
    for sub in user_subjects:
        sub_stats = get_user_stats_for_subject(current_user.user_id, sub.subject_id)
        
        # Add to the progress bars list
        mastery_progress.append({
            "subject_name": sub.subject_name,
            "avg_percentage": round(sub_stats['avg_percentage'], 1),
            "total_quizzes": sub_stats['total_quizzes']
        })
        
        # Process individual milestones for this subject
        if sub.achievement:
            for m in sub.achievement:
                m_copy = m.copy()
                m_copy['is_unlocked'] = is_milestone_achieved(m_copy, sub_stats)
                m_copy['subject_name'] = sub.subject_name # Grouping context
                mastery_milestones_list.append(m_copy)

    return jsonify({
        "badges": badges_list,
        "mastery_milestones": mastery_milestones_list,
        "mastery_progress": mastery_progress
    })


@home.route('/api/user_stats')
@login_required
def user_stats():
    # 1. Get the standard global stats (quizzes, avg, days active)
    stats = get_global_user_stats(current_user.user_id)
    
    # 2. Get the badge count from your achievement logic
    achievements_data = get_achievements().get_json() # Reuse the existing logic
    unlocked_badges = [b for b in achievements_data['badges'] if b['is_unlocked']]
    
    # 3. Add the count to the dictionary
    stats['badge_count'] = len(unlocked_badges)
    
    return jsonify(stats)

@home.route('/api/recent_activity')
@login_required
def recent_activity():
    # Join with Chapters to get the Title
    recent = db.session.query(TestResult, Chapters.title)\
        .outerjoin(Chapters, TestResult.chapter_id == Chapters.chapter_id)\
        .filter(TestResult.user_id == current_user.user_id)\
        .order_by(TestResult.timestamp.desc())\
        .all()

    output = []
    for res, title in recent:
        output.append({
            "description": f"Completed '{title if title else 'Full Subject Mix'}' Quiz",
            "score": res.percentage,
            "time_ago": format_time_ago(res.timestamp)
        })
    return jsonify(output)