from sqlalchemy import case, cast, Float
from sqlalchemy.ext.hybrid import hybrid_property

from datetime import datetime, timezone

from app.extensions import db

    
class Courses(db.Model):
    __tablename__ = 'courses'
    course_id = db.Column(db.String(32), primary_key=True)
    course_level = db.Column(db.String(50)) # 'school' or 'college'
    course_context = db.Column(db.String(50))   # 'CBSE' OR 'B.Tech' OR 'BCA'
    branch = db.Column(db.String(100))  # 'BIO' OR 'COMMON' OR 'CSE' OR 'AI'
    grade_level = db.Column(db.String(20))  # 'STD 1' OR 'YEAR 1'

class Subjects(db.Model):
    __tablename__ = 'subjects'
    subject_id = db.Column(db.String(32), primary_key=True)
    subject_name = db.Column(db.String(150), nullable=False)
    subject_overview = db.Column(db.Text)
    icon = db.Column(db.String(50))
    achievement = db.Column(db.JSON, default=[])

    course_id = db.Column(db.String(32), db.ForeignKey('courses.course_id'), nullable=False)

    chapters = db.relationship('Chapters', backref='subject', cascade="all, delete-orphan", lazy=True)

class Chapters(db.Model):
    __tablename__ = 'chapters'
    order = db.Column(db.Integer, db.Sequence('chapters_order_seq'), unique=True)
    chapter_id = db.Column(db.String(32), primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    overview = db.Column(db.Text) 
    pdf_file_path = db.Column(db.String(500), nullable=True)    # static/uploads/pdfs/filename
    video_stack = db.Column(db.JSON, default=[])
    quiz_data = db.Column(db.JSON, default=[])

    subject_id = db.Column(db.String(32), db.ForeignKey('subjects.subject_id'), nullable=False)

class TestResult(db.Model):
    __tablename__ = 'test_results'
    id = db.Column(db.Integer, primary_key=True)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    difficulty_level = db.Column(db.String(15), nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user_id = db.Column(db.String(20), db.ForeignKey('users.user_id'), nullable=False)
    chapter_id = db.Column(db.String(32), db.ForeignKey('chapters.chapter_id'), nullable=True)
    subject_id = db.Column(db.String(32), db.ForeignKey('subjects.subject_id'), nullable=True)
    
    chapter = db.relationship('Chapters', backref='test_results', lazy=True)
    subject = db.relationship('Subjects', backref='all_test_results', lazy=True)

    @hybrid_property
    def percentage(self):
        """Python-side logic for individual objects"""
        if self.total_questions and self.total_questions > 0:
            # We use float to keep precision for the progress bars
            return round((self.score * 100) / self.total_questions, 1)
        return 0

    @percentage.expression
    def percentage(cls):
        """SQL-side logic for filtering and ordering"""
        # Using cast to Float to ensure Postgres doesn't perform integer division
        return case(
            (cls.total_questions > 0, 
             cast(cls.score * 100, Float) / cast(cls.total_questions, Float)),
            else_=0
        )
