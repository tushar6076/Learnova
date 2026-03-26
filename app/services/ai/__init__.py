import os
from flask import current_app
from .ai_modal import get_ai_response
from .pdf_engine import create_pdf

# --- PARENT 1: CHAT AGENT ---
def generate_agent_chat(formatted_history, context, chapter_id, user_id):
    """Handles conversational chat using history and dynamic persona."""
    from .utils import get_dynamic_persona
    
    system_prompt = get_dynamic_persona(context, chapter_id, user_id=user_id)
    
    response = get_ai_response(
        prompt=formatted_history, 
        system_instruction=system_prompt, 
        json_mode=False
    )
    
    # Handle rate limit object from engine
    if isinstance(response, dict) and response.get("error") == "rate_limit":
        return {"reply": "I'm on a quick study break. Try again in a minute!", "status": "rate_limited"}
        
    return {"reply": response or "I'm drawing a blank. Try again?", "status": "success"}

# --- PARENT 2: PDF GENERATOR ---
def generate_chapter_pdf_file(app, chap_obj):
    """Generates structured JSON data and triggers the PDF engine."""
    
    system_prompt = "You are a Senior Academic Content Creator. Provide technical, well-structured notes in JSON."
    
    pdf_prompt = f"""
    Create a detailed academic report for the chapter: "{chap_obj.title}".
    Context: {chap_obj.overview}
    
    Return JSON with:
    - "title": string
    - "summary": string (3-4 sentences)
    - "sections": list of objects with "header" and "content" (at least 5 sections).
    """

    ai_data = get_ai_response(
        prompt=pdf_prompt, 
        system_instruction=system_prompt, 
        json_mode=True
    )

    # Fallback to prevent PDF engine crash
    if not ai_data or "error" in ai_data:
        ai_data = {
            "title": chap_obj.title,
            "summary": chap_obj.overview,
            "sections": [{"header": "Introduction", "content": "Comprehensive notes are being prepared."}]
        }

    # Setup Paths
    safe_title = "".join(x for x in chap_obj.title if x.isalnum())
    file_name = f"{chap_obj.chapter_id}_{safe_title}.pdf"
    file_path = os.path.join(app.config['BASE_DIR'], 'app', 'static', 'uploads', 'pdfs', file_name)

    # Trigger PDF Creation (LearnovaNotesPDF)
    success = create_pdf(chap_obj.title, ai_data, file_path)

    return f'/static/uploads/pdfs/{file_name}' if success else None

# --- PARENT 3: SUBJECT GENERATOR ---
def get_subject_names(course_level, course_context, branch_name, course_grade):
    """Provides a broad list of potential subjects (10-12) for admin reference."""
    prompt = (
        f"Act as a curriculum expert. For a {course_level} level ({course_context}) "
        f"in {branch_name} for {course_grade}, list 10-12 standard and elective subjects. "
        f"Include both core requirements and specialized electives."
    )
    
    system_instruction = "Return JSON: {'titles': ['Subject 1', 'Subject 2', ...]}"

    try:
        response = get_ai_response(
            prompt=prompt, 
            system_instruction=system_instruction, 
            json_mode=True
        )
        return response.get('titles', []) if response else []
    except Exception as e:
        current_app.logger.error(f"Subject Suggestion Error: {e}")
        return []

__all__ = [
    'get_ai_response',
    'get_subject_names',
    'generate_agent_chat',
    'generate_chapter_pdf_file'
]