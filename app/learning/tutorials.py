import os
import logging
from flask import current_app, jsonify, render_template
from flask_login import login_required, current_user

from app.extensions import db
from app.models import Chapters

from app.services.ai import generate_chapter_pdf_file

from . import learn

logger = logging.getLogger(__name__)


@learn.route('/tutorials', methods=['GET'])
@login_required
def tutorials():
    return render_template('tutorials.html', user=current_user)


@learn.route('/chapter/<chapter_id>', methods=['GET'])
@login_required
def load_chapter(chapter_id):
    chapter = Chapters.query.get_or_404(chapter_id)
    return render_template('chapter.html', user=current_user, chapter=chapter)


@learn.route('/chapter/<chapter_id>/get_pdf', methods=['GET'])
@login_required
def get_chapter_pdf(chapter_id):
    chapter = Chapters.query.get_or_404(chapter_id)
    
    # 1. Check if PDF already exists in DB and on Disk
    if chapter.pdf_file_path:
        # Construct absolute path to verify existence
        full_path = os.path.join(current_app.config['BASE_DIR'], 'app', chapter.pdf_file_path.lstrip('/'))
        if os.path.exists(full_path):
            return jsonify({'file_path': chapter.pdf_file_path})

    # 2. If not, generate it
    try:
        file_path = generate_chapter_pdf_file(app=current_app._get_current_object(), chap_obj=chapter)
        
        # 3. Save to DB so we don't generate it again next time
        chapter.pdf_file_path = file_path
        db.session.commit()
        
        return jsonify({'file_path': file_path})
    except Exception as e:
        current_app.logger.error(f"PDF Gen Failed: {e}")
        return jsonify({'error': 'Could not generate PDF at this time'}), 500
