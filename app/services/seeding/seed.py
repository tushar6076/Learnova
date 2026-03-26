import json
import os

from app.extensions import db
from app.models import Courses, Subjects, Chapters

def seed_data(app, file_path):
    app.logger.info(f"🚀 Seeding data from {file_path}")
    
    if not os.path.exists(file_path):
        app.logger.error(f"❌ Error: {file_path} not found.")
        return

    with open(file_path, 'r') as f:
        data = json.load(f)

    try:
        for c_data in data.get('courses', []):
            # 1. Check if Course exists
            course = Courses.query.get(c_data['course_id'])
            if not course:
                app.logger.info(f"➕ Creating Course: {c_data['course_id']}")
                course = Courses(
                    course_id=c_data['course_id'],
                    course_level=c_data['course_level'],
                    course_context=c_data['course_context'],
                    branch=c_data['branch'],
                    grade_level=c_data['grade_level']
                )
                db.session.add(course)
            else:
                app.logger.info(f"🔄 Course {c_data['course_id']} exists. Skipping creation.")

            for s_data in c_data.get('subjects', []):
                # 2. Check if Subject exists
                subject = Subjects.query.get(s_data['subject_id'])
                if not subject:
                    app.logger.info(f"  ➕ Adding Subject: {s_data['subject_name']}")
                    subject = Subjects(
                        subject_id=s_data['subject_id'],
                        subject_name=s_data['subject_name'],
                        subject_overview=s_data.get('subject_overview', ''),
                        icon=s_data.get('icon', 'bi-book'),
                        achievement=s_data.get('achievement', []),
                        course_id=course.course_id
                    )
                    db.session.add(subject)
                else:
                    app.logger.warning(f"  ⚠️ Subject {s_data['subject_id']} already exists. Skipping.")

                for ch_data in s_data.get('chapters', []):
                    if not ch_data.get('title'):
                        continue
                    
                    # 3. Check if Chapter exists
                    chapter = Chapters.query.get(ch_data['chapter_id'])
                    if not chapter:
                        try:
                            chapter = Chapters(
                                chapter_id=ch_data['chapter_id'],
                                title=ch_data['title'],
                                overview=ch_data.get('overview', ''),
                                video_stack=ch_data.get('video_stack', []),
                                quiz_data=ch_data.get('quiz_data', []),
                                subject_id=subject.subject_id
                            )
                            db.session.add(chapter)
                        except Exception as e:
                            app.logger.error(f"    ❌ Chapter Error: {e}")
                    else:
                        # Optional: Update existing chapter content if needed
                        app.logger.debug(f"    ⏩ Chapter {ch_data['chapter_id']} exists.")

        db.session.commit()
        app.logger.info("✨ Database sync completed successfully.")

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"🔥 Seeding failed: {e}")
        raise e