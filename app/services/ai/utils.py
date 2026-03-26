from flask import current_app
from google import genai
from google.genai import types
from app.utils import get_global_user_stats
from .knowledge import LEARNOVA_INFO

def get_ai_client():
    # To be honest, this retry logic is your best friend for a stable UI
    retry_config = types.HttpRetryOptions(
        attempts=3,
        initial_delay=2.0,  # Starts with a 2s wait
        max_delay=60.0,     # Won't wait longer than a minute
        # 429 is the big one, but 5xx errors happen when Google is overloaded
        http_status_codes=[408, 429, 500, 502, 503, 504]
    )

    return genai.Client(
        api_key=current_app.config['GEMINI_API_KEY'],
        http_options=types.HttpOptions(
            retry_options=retry_config,
            # Increased timeout slightly for large chapter summaries
            timeout=60000 
        )
    )

def get_dynamic_persona(context, chapter_id=None, user_id=None):
    """
    Constructs a specialized system prompt. 
    user_id is now optional to prevent crashes if not provided.
    """
    # 1. Academic Tutor Persona (Chapter Context)
    if context == 'chapter' and chapter_id:
        from app.models import Chapters
        chapter = Chapters.query.get(chapter_id)
        name = chapter.title if chapter else "this topic"
        return (
            f"You are an expert academic tutor for the chapter: '{name}'. {LEARNOVA_INFO}\n"
            "Goal: Mastery of the PDF/Video stack. Explanations: Simple & Bulleted. Tone: Strictly academic."
        )

    # 2. Mentor Persona (Global Context)
    # If we have a user_id, we pull their real performance data
    if user_id:
        stats = get_global_user_stats(user_id)
        performance_summary = (
            f"Student Stats: {stats['total_quizzes']} quizzes, "
            f"Avg: {stats['avg_percentage']}%, Active: {stats['days_active']} days."
        )
    else:
        performance_summary = "The student is just starting their journey today."

    return (
        f"You are the Learnova Mentor. {LEARNOVA_INFO}\n"
        f"Current Status: {performance_summary}\n"
        "Tone: Encouraging, witty, and strategic. Push them to maintain their streak!"
    )