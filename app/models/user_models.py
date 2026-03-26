from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

from datetime import datetime, timezone

from app.extensions import db


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.String(20), primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=True)
    is_profile_complete = db.Column(db.Boolean, default=False)
    
    # 1-to-1 relationship: User.details will return the UserDetails object
    details = db.relationship('UserDetails', backref='user', uselist=False, cascade="all, delete-orphan", lazy=True)
    test_results = db.relationship('TestResult', backref='user', cascade="all, delete-orphan", lazy=True)
    reviews = db.relationship('Reviews', backref='author', lazy=True)
    sessions = db.relationship('ChatSession', backref='user', cascade="all, delete-orphan", lazy=True)

    def get_id(self):
        return self.user_id

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class UserDetails(db.Model):
    __tablename__ = 'user_details'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    photo = db.Column(db.String(255), default='default-avatar.png')
    # academic_level = db.Column(db.String(50))   # 'school' or 'college'
    academic_context = db.Column(db.String(100)) # 'CBSE' or 'B.Tech'
    branch = db.Column(db.String(100))  # 'CSE' OR 'COMMON'
    grade_level = db.Column(db.String(50), nullable=True)
    selected_subjects = db.Column(db.JSON, default=[])

    user_id = db.Column(db.String(20), db.ForeignKey('users.user_id'), unique=True, nullable=False)
    course_id = db.Column(db.String(32), db.ForeignKey('courses.course_id'), nullable=False)


class Reviews(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)

    issue_type = db.Column(db.String(50), nullable=False)
    issue_details = db.Column(db.Text)
    is_resolved = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user_id = db.Column(db.String(20), db.ForeignKey('users.user_id'), nullable=True)

