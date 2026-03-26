import logging
from flask import jsonify, request
from flask_login import current_user, login_required

from app.home import home

from app.extensions import db, limiter
from app.models import ChatSession, ChatMessage

from app.utils import save_chat_message

from app.services.ai import generate_agent_chat


logger = logging.getLogger(__name__)


@home.route('/api/chat', methods=['GET'])
@login_required
def get_chat_history():
    context = request.args.get('context', 'home')
    chapter_id = request.args.get('chapter_id')
    if chapter_id == 'none': chapter_id = None

    session = ChatSession.query.filter_by(
        user_id=current_user.user_id,
        context=context,
        chapter_id=chapter_id
    ).first()

    if not session:
        return jsonify({"messages": []})

    # Get messages in chronological order (oldest first for display)
    messages = ChatMessage.query.filter_by(session_id=session.session_id)\
        .order_by(ChatMessage.timestamp.asc()).all()

    return jsonify({
        "messages": [
            {"sender": m.sender, "content": m.content, "time": m.timestamp.isoformat()} 
            for m in messages
        ]
    })  


@home.route('/api/ai-chat', methods=['POST'])
@login_required
@limiter.limit("10 per 5 minutes")
def ai_chat():
    data = request.get_json()
    user_message = data.get('message')
    context = data.get('context', 'home')
    chapter_id = data.get('chapter_id') if context == 'chapter' and data.get('chapter_id') != 'none' else None

    # 1. Fetch/Create Session (Fast)
    session = ChatSession.query.filter_by(
        user_id=current_user.user_id,
        context=context,
        chapter_id=chapter_id
    ).first()

    if not session:
        session = ChatSession(user_id=current_user.user_id, context=context, chapter_id=chapter_id)
        db.session.add(session)
        db.session.commit()

    # 2. SAVE USER MESSAGE IN BACKGROUND
    save_chat_message.submit(session.session_id, 'user', user_message)

    # 3. Retrieve History (Normal logic)
    history_records = ChatMessage.query.filter_by(session_id=session.session_id)\
        .order_by(ChatMessage.timestamp.desc())\
        .limit(6).all()
    
    formatted_history = []
    for msg in reversed(history_records):
        role = "user" if msg.sender == "user" else "model"
        formatted_history.append({"role": role, "parts": [{"text": msg.content}]})

    if not formatted_history or formatted_history[-1]["parts"][0]["text"] != user_message:
        formatted_history.append({"role": "user", "parts": [{"text": user_message}]})

    # 4. Get AI Response
    ai_response = generate_agent_chat(context, chapter_id, formatted_history, current_user.user_id)

    if ai_response["status"] == "success":
        ai_reply = ai_response["reply"]
        
        # 5. SAVE AI REPLY IN BACKGROUND
        save_chat_message.submit(session.session_id, 'ai', ai_reply)

        # Return to user immediately!
        return jsonify({
            "reply": ai_reply, 
            "status": "success"
        })

    else:
        return jsonify({
            "reply": ai_response["reply"],
            "status": ai_response["status"]
        }), ai_response["status_code"]
    
    

@home.route('/api/clear-history', methods=['POST'])
@login_required
def clear_chat_history():
    data = request.get_json()
    context = data.get('context', 'home')
    chapter_id = data.get('chapter_id')
    if chapter_id == 'none': chapter_id = None

    try:
        session = ChatSession.query.filter_by(
            user_id=current_user.user_id,
            context=context,
            chapter_id=chapter_id
        ).first()

        if session:
            db.session.delete(session) # This triggers the cascade delete for all messages!
            db.session.commit()
        
        return jsonify({"status": "success", "message": "History cleared"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to clear history"}), 500