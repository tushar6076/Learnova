from datetime import datetime, timezone

from app.extensions import db

from .utils import generate_secret_id

class ChatSession(db.Model):
    __tablename__ = 'chat_sessions'
    session_id = db.Column(db.String(20), primary_key=True, default=generate_secret_id)
    context = db.Column(db.String(50)) # 'home' or 'chapter'

    # Fixed: Match the String(20) from the User model
    user_id = db.Column(db.String(20), db.ForeignKey('users.user_id'), nullable=False)
    chapter_id = db.Column(db.String(20), db.ForeignKey('chapters.chapter_id'), nullable=True)
    
    # Cascade ensures that if the session dies, the messages die too
    messages = db.relationship('ChatMessage', backref='session', lazy=True, cascade="all, delete-orphan")

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    message_id = db.Column(db.Integer, primary_key=True)
    sender = db.Column(db.String(10)) # 'user' or 'ai'
    content = db.Column(db.Text, nullable=False)
    
    # 2026 Best Practice: Use timezone-aware UTC
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    session_id = db.Column(db.String(20), db.ForeignKey('chat_sessions.session_id'), nullable=False)